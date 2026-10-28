import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './mail/mail.service'; 

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService, 
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-mail') // 👈 Route accessible sur http://localhost:3000/test-mail
  async sendTestEmail() {
    // ⚠️ Remplacez 'votre-email@gmail.com' par l'adresse e-mail de votre compte Resend
    const result = await this.mailService.sendMail(
      'sambatsyanjara@gmail.com', 
      ' TransTrack', 
      '<h1>Ça fonctionne ! 🎉</h1><p>Votre application  envoie bien des e-mails avec Gmail.</p>' // 👈 Correction de la balise <p>
    );

    return result;
  }
}