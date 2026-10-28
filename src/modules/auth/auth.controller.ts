import {
  Controller, Post, Body, Get, Request, UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteClientProfileDto } from './dto/complete-client-profile.dto';
import { RequestAgentDto } from './dto/request-agent.dto';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @Post('complete-client-profile')
  @UseGuards(AuthGuard('jwt'))
  completeClientProfile(@Body() dto: CompleteClientProfileDto, @Request() req) {
    return this.authService.completeClientProfile(req.user.id, dto);
  }

  @Post('request-agent-invitation')
  @UseGuards(AuthGuard('jwt'))
  requestAgentInvitation(@Body() dto: RequestAgentDto, @Request() req) {
    return this.authService.requestAgentInvitation(req.user.id, dto);
  }

  // ✅ Validation du code
  @Post('validate-invitation')
  @UseGuards(AuthGuard('jwt'))
  validateInvitationCode(@Body() dto: ValidateInvitationDto, @Request() req) {
    return this.authService.validateInvitationCode(req.user.id, dto);
  }

  // ✅ Régénérer le code
  @Post('resend-invitation-code')
  @UseGuards(AuthGuard('jwt'))
  resendInvitationCode(@Request() req) {
    return this.authService.resendInvitationCode(req.user.id);
  }

  // ✅ Statut de l'invitation (polling)
  @Get('agent-invitation-status')
  @UseGuards(AuthGuard('jwt'))
  getAgentInvitationStatus(@Request() req) {
    return this.authService.getAgentInvitationStatus(req.user.id);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('validate-reset-token')
  validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }
}