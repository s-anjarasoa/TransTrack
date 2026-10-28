import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Billet } from 'src/entities/billet.entity';
 

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private configService: ConfigService) {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!user || !pass) {
      this.logger.error('MAIL_USER ou MAIL_PASS manquant dans le .env');
    }

    this.from = this.configService.get<string>('MAIL_FROM') ?? `TransTrack <${user}>`;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  // ✅ Ta méthode générique existante
  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Mail envoyé à ${to}, id=${info.messageId}`);
      return { success: true, data: info };
    } catch (error: any) {
      this.logger.error(`Échec envoi mail à ${to} : ${error.message}`);
      return { success: false, error };
    }
  }

  // ✅ NOUVELLE MÉTHODE : Envoi du billet (utilise sendMail)
  async sendTicketEmail(to: string, billet: Billet): Promise<void> {
    const voyage = billet.reservation?.voyage;
    const route = voyage?.route;
    const client = billet.reservation?.client?.user;

    if (!voyage || !route) {
      this.logger.error('Impossible d\'envoyer le billet : données du voyage manquantes.');
      return;
    }

    const subject = `Votre billet ${billet.numeroBillet} - ${route.depart} → ${route.arrivee}`;

    // Un joli template HTML pour l'email
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; background: #FFFFFF;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0E7490, #0891B2); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: #FFFFFF; font-size: 24px;">🎫 Votre Billet TransTrack</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #1F2937;">Bonjour <strong>${client?.firstName ?? 'Voyageur'}</strong>,</p>
          <p style="font-size: 14px; color: #4B5563;">Voici les détails de votre voyage :</p>

          <div style="background: #F9FAFB; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280;"><strong>Trajet</strong></td>
                <td style="padding: 8px 0; color: #0F172A; text-align: right;"><strong>${route.depart} → ${route.arrivee}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;"><strong>N° Billet</strong></td>
                <td style="padding: 8px 0; color: #0E7490; text-align: right; font-family: monospace; font-weight: bold;">${billet.numeroBillet}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;"><strong>Date de départ</strong></td>
                <td style="padding: 8px 0; color: #0F172A; text-align: right;">${new Date(voyage.dateDepart).toLocaleString('fr-FR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;"><strong>Prix</strong></td>
                <td style="padding: 8px 0; color: #0F172A; text-align: right;">${Number(billet.prix).toLocaleString('fr-FR')} Ar</td>
              </tr>
            </table>
          </div>

          <!-- Section QR Code -->
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #F0FDFA; border: 1px solid #A7F3D0; border-radius: 12px;">
            <p style="margin: 0 0 10px; font-size: 12px; color: #0E7490; text-transform: uppercase; font-weight: bold;">Présentez ce code à l'embarquement</p>
            <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #0F172A; word-break: break-all;">
              ${billet.qrCode}
            </div>
          </div>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 30px;">
            Merci de voyager avec TransTrack. Bon voyage !
          </p>
        </div>
      </div>
    `;

    // ✅ Utilise ta méthode existante
    const result = await this.sendMail(to, subject, html);
    
    if (!result.success) {
      throw new Error("Impossible d'envoyer l'email du billet");
    }
  }
}