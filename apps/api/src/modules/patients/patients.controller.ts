import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PatientsService } from './patients.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'patients', version: '1' })
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      { organizationId, search, page: page ? +page : 1, limit: limit ? +limit : 20 },
      user,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, body, user);
  }
}
