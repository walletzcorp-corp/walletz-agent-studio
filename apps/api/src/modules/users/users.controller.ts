import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { Authenticated } from '../../shared/rbac/access-policy.decorators';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Authenticated()
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findProfileById(user.sub);
  }
}
