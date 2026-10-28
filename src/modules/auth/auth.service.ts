import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { Client } from '../../entities/client.entity';
import { Agent, AgentType } from '../../entities/agent.entity';
import { Status, AgentStatus } from '../../entities/status.entity';
import { Societe, SocieteStatut } from '../../entities/societe.entity';
import {
  NotificationType,
  NotificationPriorite,
} from '../../entities/notification.entity';

import { RolesService } from '../roles/roles.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { hasActiveSubscription } from '../../common/utils/subscription.util';

import {
  generateOtp,
  hashOtp,
  verifyOtp,
  CODE_VALIDITY_MS,
} from '../../common/utils/code-generator.util';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteClientProfileDto } from './dto/complete-client-profile.dto';
import { RequestAgentDto } from './dto/request-agent.dto';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';

// Nombre maximum de saisies incorrectes avant d'exiger un nouveau code
const MAX_CODE_ATTEMPTS = 5;
// Délai minimum entre deux renvois de code par l'agent
const RESEND_COOLDOWN_MS = 10 * 1000;

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60
    ? `${Math.round(seconds / 60)} minute(s)`
    : `${seconds} secondes`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(Client) private clientRepository: Repository<Client>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    @InjectRepository(Status) private statusRepository: Repository<Status>,
    @InjectRepository(Societe) private societeRepository: Repository<Societe>,
    @InjectDataSource() private dataSource: DataSource,
    private jwtService: JwtService,
    private rolesService: RolesService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  /** Clé secrète servant à calculer l'empreinte des codes (variable du .env) */
  private get otpSecret(): string {
    return this.configService.getOrThrow<string>('INVITATION_CODE_SECRET');
  }

  // ============================================================
  // REGISTER
  // ============================================================
  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) throw new ConflictException('Email déjà utilisé');

    const userRole = await this.rolesService.getRoleByRegistrationOrder();
    if (!userRole) throw new Error('Aucun rôle disponible');

    this.logger.log(`Nouvel utilisateur: ${registerDto.email} -> ${userRole.name}`);

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const isFirstUser = userRole.name === 'ADMIN';

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      roleId: userRole.id,
      isActive: true,
      profileCompleted: isFirstUser,
    });
    await this.userRepository.save(user);

    const userWithRole = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { role: true },
    });

    const payload = {
      id: user.id,
      email: user.email,
      role: userWithRole?.role?.name || userRole.name,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userWithRole?.role?.name || userRole.name,
        profileCompleted: user.profileCompleted,
        agentStatus: null,
      },
    };
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: { role: true, agent: true },
    });
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Email ou mot de passe incorrect');

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Compte désactivé. Contactez un administrateur.',
      );
    }

    await this.userRepository.update(user.id, { lastLogin: new Date() });

    const payload = { id: user.id, email: user.email, role: user.role?.name };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name,
        profileCompleted: user.profileCompleted,
        // ✅ Permet au front de rediriger un agent en attente vers /auth/agent-code
        agentStatus: user.agent?.status ?? null,
      },
    };
  }

  // ============================================================
  // GET ME
  // ============================================================
  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, client: true, agent: true },
    });
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name,
      roleId: user.roleId,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      hasClient: !!user.client,
      hasAgent: !!user.agent,
      agentStatus: user.agent?.status ?? null,
    };
  }

  // ============================================================
  // COMPLÉTION DE PROFIL CLIENT
  // ============================================================
  async completeClientProfile(userId: number, dto: CompleteClientProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const existingClient = await this.clientRepository.findOne({ where: { userId } });
    if (existingClient) throw new BadRequestException('Vous avez déjà un profil Client.');

    const existingAgent = await this.agentRepository.findOne({
      where: { userId },
      relations: { societe: true },
    });
    if (existingAgent) {
      throw new BadRequestException(
        `Vous avez déjà un profil Agent pour la société "${existingAgent.societe?.name || 'inconnue'}".`,
      );
    }

    if (user.profileCompleted) {
      throw new BadRequestException('Votre profil est déjà complété.');
    }

    const clientRole = await this.rolesService.findByName('CLIENT');
    if (!clientRole) throw new NotFoundException('Rôle CLIENT non trouvé');

    return this.dataSource.transaction(async (manager) => {
      const client = manager.create(Client, {
        userId,
        phone: dto.phone,
        address: dto.address,
        CIN: dto.CIN,
        passport: dto.passport,
      });
      await manager.save(client);

      await manager.update(User, userId, {
        roleId: clientRole.id,
        profileCompleted: true,
      });

      const updatedUser = await manager.findOne(User, {
        where: { id: userId },
        relations: { role: true },
      });

      const payload = {
        id: updatedUser!.id,
        email: updatedUser!.email,
        role: updatedUser!.role?.name,
      };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          role: updatedUser!.role?.name,
          profileCompleted: true,
          agentStatus: null,
        },
      };
    });
  }

  // ============================================================
  // DEMANDE D'INSCRIPTION AGENT
  // ✅ L'utilisateur reste PENDING et actif : il peut donc se reconnecter,
  //    suivre sa demande et saisir son code. Le rôle AGENT n'est attribué
  //    qu'après validation du code.
  // ============================================================
  async requestAgentInvitation(userId: number, dto: RequestAgentDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (user.profileCompleted) {
      throw new BadRequestException('Profil déjà complété');
    }

    const currentRole = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });
    if (currentRole?.name !== 'PENDING') {
      throw new BadRequestException('Action non autorisée pour ce rôle');
    }

    if (dto.type === AgentType.DIRECTEUR) {
      throw new BadRequestException('Seul un Administrateur peut créer un DIRECTEUR');
    }

    const societe = await this.societeRepository.findOne({
      where: { id: dto.societeId },
    });
    if (!societe) throw new NotFoundException('Société non trouvée');
    if (societe.statut !== SocieteStatut.VALIDEE) {
      throw new BadRequestException("Cette société n'est pas encore validée");
    }
    // ✅ Une société sans abonnement actif n'accepte pas de nouvelles demandes
    if (!(await hasActiveSubscription(this.dataSource, societe.id))) {
      throw new BadRequestException(
        "Cette société n'accepte pas de nouveaux agents pour le moment (abonnement inactif).",
      );
    }

    // Une demande rejetée peut être renvoyée ; une demande en cours non.
    const existingAgent = await this.agentRepository.findOne({ where: { userId } });
    if (existingAgent && existingAgent.status !== AgentStatus.REJETE) {
      throw new BadRequestException('Vous avez déjà une demande Agent en cours.');
    }

    const agent = await this.dataSource.transaction(async (manager) => {
      const values = {
        CIN: dto.CIN,
        phone: dto.phone,
        address: dto.address,
        type: dto.type ?? AgentType.RECEPTIONNISTE,
        societeId: societe.id,
        status: AgentStatus.EN_ATTENTE,
        codeHash: null,
        codeExpiresAt: null,
        codeAttempts: 0,
      };

      let savedAgent: Agent;
      if (existingAgent) {
        await manager.update(Agent, existingAgent.id, values);
        savedAgent = await manager.findOneByOrFail(Agent, { id: existingAgent.id });
      } else {
        savedAgent = await manager.save(
          manager.create(Agent, { userId, ...values }),
        );
      }

      await manager.save(Status, {
        agentId: savedAgent.id,
        status: AgentStatus.EN_ATTENTE,
        isActive: false,
        reason: "Demande d'inscription agent",
      });

      return savedAgent;
    });

    // ✅ Notification au Directeur/Gérant
    const directeurs = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.name = :role', { role: 'AGENT' })
      .innerJoin('user.agent', 'agent')
      .andWhere('agent.societeId = :societeId', { societeId: societe.id })
      .andWhere('agent.type IN (:...types)', {
        types: [AgentType.DIRECTEUR, AgentType.GERANT],
      })
      .getMany();

    const destinataires = directeurs.map((d) => d.id);

    if (destinataires.length > 0) {
      await this.notificationsService.notifyUsers(destinataires, {
        type: NotificationType.VALIDATION_AGENT,
        titre: "🔔 Nouvelle demande d'agent",
        message: `${user.firstName} ${user.lastName} (${
          dto.type ?? 'RECEPTIONNISTE'
        }) souhaite rejoindre votre société ${societe.name}.`,
        priorite: NotificationPriorite.HAUTE,
        societeId: societe.id,
        metadata: {
          entityType: 'agent',
          entityId: agent.id,
          actionUrl: `/agents/${agent.id}`,
          actionLabel: 'Examiner la demande',
        },
      });
    }

    return {
      message: 'Demande envoyée. Le Directeur va valider votre inscription.',
      status: AgentStatus.EN_ATTENTE,
    };
  }

  // ============================================================
  // ✅ ÉMISSION DU CODE D'INVITATION (génère + envoie l'e-mail)
  // Appelée par AgentsService quand le Directeur/Gérant passe l'agent à
  // PRE_VALIDE, et par resendInvitationCode().
  // ============================================================
  async issueInvitationCode(agentId: number) {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
      relations: { societe: true, user: true },
    });
    if (!agent) throw new NotFoundException('Agent non trouvé');
    if (!agent.societe) throw new NotFoundException('Société introuvable');
    if (!agent.user?.email) {
      throw new NotFoundException("Utilisateur de l'agent introuvable");
    }

    // ✅ Code aléatoire à usage unique : seule son empreinte est stockée.
    // Un nouveau code remplace (et invalide) le précédent.
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + CODE_VALIDITY_MS);

    await this.agentRepository.update(agent.id, {
      codeHash: hashOtp(code, agent.id, this.otpSecret),
      codeExpiresAt: expiresAt,
      codeAttempts: 0,
    });

    const duration = formatDuration(CODE_VALIDITY_MS);

    const societeName = escapeHtml(agent.societe.name ?? '');
    const firstName = escapeHtml(agent.user.firstName || 'Agent');

    const result = await this.mailService.sendMail(
      agent.user.email,
      `Code d'invitation - ${agent.societe.name}`,
      `
        <h2>Code d'invitation pour ${societeName}</h2>
        <p>Bonjour ${firstName},</p>
        <p>Voici votre code d'invitation pour valider votre compte :</p>
        <h1 style="background:#f4f4f4;padding:10px;display:inline-block;letter-spacing:4px">${code}</h1>
        <p>Ce code est valable ${duration}. Passé ce délai, demandez-en un nouveau depuis l'application.</p>
      `,
    );

    if (!result.success) {
      this.logger.error(
        `Échec envoi du code d'invitation à ${agent.user.email} (agent ${agent.id})`,
      );
    }

    // Notification in-app SANS le code (il n'est transmis que par e-mail)
    await this.notificationsService.notifyUsers([agent.userId], {
      type: NotificationType.MESSAGE,
      titre: "🔑 Code d'invitation envoyé",
      message: `Un code d'invitation a été envoyé à ${agent.user.email}. Il est valable ${duration}.`,
      priorite: NotificationPriorite.URGENTE,
      metadata: {
        entityType: 'agent',
        entityId: agent.id,
        actionUrl: '/auth/agent-code',
        actionLabel: 'Entrer le code',
      },
    });

    this.logger.log(`Code d'invitation émis pour l'agent ${agent.id}`);

    return { expiresAt, emailSent: result.success };
  }

  // ============================================================
  // ✅ VALIDER LE CODE D'INVITATION
  // Ici seulement : rôle PENDING -> AGENT, statut -> VALIDE
  // ============================================================
  async validateInvitationCode(userId: number, dto: ValidateInvitationDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: { societe: true },
    });
    if (!agent) throw new NotFoundException('Profil agent non trouvé');

    if (agent.status !== AgentStatus.PRE_VALIDE) {
      throw new BadRequestException(
        "Vous n'êtes pas en attente de validation de code",
      );
    }

    if ((agent.codeAttempts ?? 0) >= MAX_CODE_ATTEMPTS) {
      throw new BadRequestException(
        'Trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    const isValid = verifyOtp(
      dto.code,
      agent.codeHash,
      agent.codeExpiresAt,
      agent.id,
      this.otpSecret,
    );

    if (!isValid) {
      await this.agentRepository.increment({ id: agent.id }, 'codeAttempts', 1);
      throw new BadRequestException(
        'Code invalide ou expiré. Veuillez demander un nouveau code.',
      );
    }

    const agentRole = await this.rolesService.findByName('AGENT');
    if (!agentRole) throw new NotFoundException('Rôle AGENT non trouvé');

    const updatedUser = await this.dataSource.transaction(async (manager) => {
      await manager.update(Agent, agent.id, {
        status: AgentStatus.VALIDE,
        codeHash: null, // ✅ usage unique : le code ne peut plus resservir
        codeExpiresAt: null,
        codeAttempts: 0,
      });

      await manager.save(Status, {
        agentId: agent.id,
        status: AgentStatus.VALIDE,
        isActive: true,
        reason: "Code d'invitation validé par l'agent",
      });

      await manager.update(User, userId, {
        roleId: agentRole.id,
        profileCompleted: true,
        isActive: true,
      });

      return manager.findOneOrFail(User, {
        where: { id: userId },
        relations: { role: true },
      });
    });

    // Notifications (hors transaction)
    await this.notificationsService.notifyUsers([userId], {
      type: NotificationType.VALIDATION_AGENT,
      titre: '✅ Compte validé',
      message: `Bienvenue dans la société ${agent.societe?.name} !`,
      priorite: NotificationPriorite.NORMALE,
    });

    const directeurs = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.name = :role', { role: 'AGENT' })
      .innerJoin('user.agent', 'agent')
      .andWhere('agent.societeId = :societeId', { societeId: agent.societeId })
      .andWhere('agent.type = :type', { type: AgentType.DIRECTEUR })
      .getMany();

    const destinataires = directeurs.map((d) => d.id);
    if (destinataires.length > 0) {
      await this.notificationsService.notifyUsers(destinataires, {
        type: NotificationType.MESSAGE,
        titre: '✅ Agent validé',
        message: `${user.firstName} ${user.lastName} a validé son inscription.`,
        priorite: NotificationPriorite.NORMALE,
        societeId: agent.societeId!,
      });
    }

    this.logger.log(`✅ Agent ${agent.id} validé avec code`);

    // ✅ Nouveau token : le rôle a changé (PENDING -> AGENT)
    const token = this.jwtService.sign({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role?.name,
    });

    return {
      message: `Bienvenue dans la société ${agent.societe?.name} !`,
      access_token: token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role?.name,
        profileCompleted: true,
        agentStatus: AgentStatus.VALIDE,
      },
    };
  }

  // ============================================================
  // ✅ STATUT DE L'INVITATION (polling du front)
  // ============================================================
  async getAgentInvitationStatus(userId: number) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: { societe: true },
    });

    if (!agent) {
      return {
        hasAgent: false,
        status: null,
        societeName: null,
        isPreValide: false,
        hasCode: false,
        expiresAt: null,
        expiresInSeconds: 0,
      };
    }

    const isPreValide = agent.status === AgentStatus.PRE_VALIDE;
    const hasCode = isPreValide && !!agent.codeHash && !!agent.codeExpiresAt;
    const expiresAt = hasCode ? agent.codeExpiresAt : null;

    return {
      hasAgent: true,
      status: agent.status,
      societeName: agent.societe?.name ?? null,
      isPreValide,
      hasCode,
      expiresAt,
      // Utile pour éviter les écarts d'horloge entre serveur et navigateur
      expiresInSeconds: expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
        : 0,
    };
  }

  // ============================================================
  // ✅ RENVOYER UN NOUVEAU CODE (après expiration)
  // ============================================================
  async resendInvitationCode(userId: number) {
    const agent = await this.agentRepository.findOne({ where: { userId } });
    if (!agent) throw new NotFoundException('Profil agent non trouvé');

    if (agent.status !== AgentStatus.PRE_VALIDE) {
      throw new BadRequestException("Vous n'êtes pas en attente de validation");
    }

    // Date d'envoi du code courant = expiration - durée de validité
    if (
      agent.codeExpiresAt &&
      Date.now() - (agent.codeExpiresAt.getTime() - CODE_VALIDITY_MS) <
        RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Veuillez patienter quelques secondes avant de demander un nouveau code.',
      );
    }

    const { expiresAt, emailSent } = await this.issueInvitationCode(agent.id);

    return {
      message: emailSent
        ? 'Nouveau code envoyé par e-mail'
        : "Le code a été généré mais l'e-mail n'a pas pu être envoyé. Réessayez.",
      expiresAt,
      emailSent,
    };
  }

  // ============================================================
  // ✅ E-MAIL « DÉFINIR MON MOT DE PASSE » (compte créé par la direction)
  // Réutilise le mécanisme de réinitialisation : l'agent choisit son mot de
  // passe, personne d'autre ne le connaît.
  // ============================================================
  async sendAccountSetupEmail(
    user: { id: number; email: string; firstName?: string | null },
    societeName: string,
    validityHours = 48,
  ): Promise<boolean> {
    await this.resetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    await this.resetTokenRepository.save({
      token,
      userId: user.id,
      expiresAt,
      isUsed: false,
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const link = `${frontendUrl}/auth/reset-password?token=${token}`;

    const result = await this.mailService.sendMail(
      user.email,
      `Bienvenue chez ${societeName} - définissez votre mot de passe`,
      `
        <h2>Bienvenue chez ${escapeHtml(societeName)}</h2>
        <p>Bonjour ${escapeHtml(user.firstName || '')},</p>
        <p>Un compte agent TransTrack vient d'être créé pour vous. Cliquez sur le lien ci-dessous pour définir votre mot de passe :</p>
        <p><a href="${link}">${link}</a></p>
        <p>Ce lien expire dans ${validityHours} heures. S'il a expiré, utilisez « Mot de passe oublié » sur la page de connexion.</p>
      `,
    );

    if (!result.success) {
      this.logger.error(`Échec envoi e-mail de création de compte à ${user.email}`);
    }

    return result.success;
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Même message que le compte existe ou non (évite de révéler les comptes)
    const genericResponse = {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.',
    };

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return genericResponse;

    await this.resetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.resetTokenRepository.save({
      token: resetToken,
      userId: user.id,
      expiresAt,
      isUsed: false,
    });

    // ✅ Lien vers le FRONT (Angular), pas vers l'API.
    // Adapte le chemin si ta route Angular est différente.
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const result = await this.mailService.sendMail(
      user.email,
      'Réinitialisation de mot de passe',
      `
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Bonjour ${escapeHtml(user.firstName || '')},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Ce lien expirera dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      `,
    );

    if (!result.success) {
      this.logger.error(`Échec envoi e-mail de réinitialisation à ${user.email}`);
    }

    return genericResponse;
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const resetToken = await this.resetTokenRepository.findOne({
      where: { token, isUsed: false },
      relations: { user: true },
    });
    if (!resetToken) throw new BadRequestException('Token invalide');
    if (new Date() > resetToken.expiresAt) throw new BadRequestException('Token expiré');

    const user = await this.userRepository.findOne({ where: { id: resetToken.userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.update(user.id, { password: hashedPassword });
    await this.resetTokenRepository.update(resetToken.id, { isUsed: true });

    return { message: 'Mot de passe réinitialisé.' };
  }

  async validateResetToken(token: string) {
    const resetToken = await this.resetTokenRepository.findOne({
      where: { token, isUsed: false },
    });
    if (!resetToken) return { valid: false, message: 'Token invalide' };
    if (new Date() > resetToken.expiresAt) return { valid: false, message: 'Token expiré' };
    return { valid: true };
  }
}