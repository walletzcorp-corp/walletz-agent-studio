import { Controller, Get, Post, Param } from '@nestjs/common';
import { TelService } from './services/tel.service';

// Rotas públicas da telemedicina — sem autenticação JWT.
// RV-TELE-008: links individuais, temporários e revogáveis.
@Controller({ path: 'tel-join', version: '1' })
export class TelPublicController {
  constructor(private readonly telService: TelService) {}

  // Resolve token → info da sala (GET para validar sem entrar)
  @Get(':token')
  resolveToken(@Param('token') token: string) {
    return this.telService.resolveJoinToken(token);
  }

  // Paciente entra efetivamente na sala (POST registra a entrada)
  @Post(':token')
  joinRoom(@Param('token') token: string) {
    return this.telService.joinRoomByToken(token);
  }
}
