import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('v1/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
