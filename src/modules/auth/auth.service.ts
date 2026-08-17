import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    const userRole = await this.rolesService.getRoleByRegistrationOrder();
    
    if (!userRole) {
      throw new Error('Aucun rôle disponible');
    }

    this.logger.log(`Nouvel utilisateur: ${registerDto.email} -> Rôle: ${userRole.name}`);

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      roleId: userRole.id,
    });

    await this.userRepository.save(user);

    const userWithRole = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { role: true },
    });

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: userWithRole?.role?.name || userRole.name 
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
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    await this.userRepository.update(user.id, { lastLogin: new Date() });

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role?.name 
    };
    const token = this.jwtService.sign(payload);

    this.logger.log(`Utilisateur connecté: ${user.email} (${user.role?.name})`);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Forgot Password - Envoie un email de réinitialisation
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Vérifier si l'utilisateur existe
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
      this.logger.log(`Tentative de réinitialisation pour email inexistant: ${email}`);
      return {
        message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.',
      };
    }

    // Invalider les anciens tokens
    await this.resetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valable 1 heure

    // Sauvegarder le token
    await this.resetTokenRepository.save({
      token: resetToken,
      userId: user.id,
      expiresAt,
      isUsed: false,
    });

    // TODO: Envoyer l'email avec le lien de réinitialisation
    // Dans un cas réel, vous utiliseriez un service d'email (Nodemailer, SendGrid, etc.)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    this.logger.log(`Lien de réinitialisation envoyé à ${email}: ${resetLink}`);
    
    // Simuler l'envoi d'email
    // await this.emailService.sendResetPasswordEmail(user.email, resetLink);

    return {
      message: 'Un lien de réinitialisation a été envoyé à votre adresse email.',
    };
  }

  /**
   * Reset Password - Réinitialise le mot de passe avec un token valide
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Trouver le token
    const resetToken = await this.resetTokenRepository.findOne({
      where: { token, isUsed: false },
      relations: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Token invalide ou déjà utilisé');
    }

    // Vérifier si le token a expiré
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Le token a expiré. Veuillez recommencer la procédure.');
    }

    // Vérifier si l'utilisateur existe toujours
    const user = await this.userRepository.findOne({
      where: { id: resetToken.userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe
    await this.userRepository.update(user.id, { password: hashedPassword });

    // Marquer le token comme utilisé
    await this.resetTokenRepository.update(resetToken.id, { isUsed: true });

    this.logger.log(`Mot de passe réinitialisé pour l'utilisateur: ${user.email}`);

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès.',
    };
  }

  /**
   * Vérifier si un token de réinitialisation est valide
   */
  async validateResetToken(token: string) {
    const resetToken = await this.resetTokenRepository.findOne({
      where: { token, isUsed: false },
    });

    if (!resetToken) {
      return { valid: false, message: 'Token invalide' };
    }

    if (new Date() > resetToken.expiresAt) {
      return { valid: false, message: 'Token expiré' };
    }

    return { valid: true };
  }
}

