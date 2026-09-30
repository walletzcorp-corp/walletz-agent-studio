import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class PepTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(body: any, user: AuthenticatedUser) {
    this.assertAccess(body.organizationId, user);
    return this.prisma.pepTemplate.create({
      data: {
        organizationId: body.organizationId,
        specialtyId: body.specialtyId,
        name: body.name,
        fields: (body.fields ?? {}) as any,
      },
    });
  }

  async findAll(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.pepTemplate.findMany({
      where: { organizationId, active: true },
      include: { specialty: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const tpl = await this.prisma.pepTemplate.findUnique({
      where: { id },
      include: { specialty: { select: { id: true, name: true } } },
    });
    if (!tpl) throw new NotFoundException('Modelo não encontrado');
    this.assertAccess(tpl.organizationId, user);
    return tpl;
  }

  async update(id: string, body: any, user: AuthenticatedUser) {
    const tpl = await this.prisma.pepTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Modelo não encontrado');
    this.assertAccess(tpl.organizationId, user);
    return this.prisma.pepTemplate.update({
      where: { id },
      data: { name: body.name, specialtyId: body.specialtyId, fields: (body.fields ?? undefined) as any, active: body.active },
    });
  }
}
