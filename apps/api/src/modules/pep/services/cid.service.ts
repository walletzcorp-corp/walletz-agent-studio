import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CidService {
  constructor(private readonly prisma: PrismaService) {}

  // RF-PEP-006: search CID-10 codes
  async search(q: string, version = '10', limit = 20) {
    if (!q || q.trim().length < 2) return [];

    const term = q.trim().toUpperCase();
    return this.prisma.cidCode.findMany({
      where: {
        version,
        active: true,
        OR: [
          { code: { startsWith: term } },
          { description: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      orderBy: [{ code: 'asc' }],
      take: Math.min(limit, 100),
    });
  }

  async getByCode(code: string, version = '10') {
    return this.prisma.cidCode.findFirst({ where: { code: code.toUpperCase(), version } });
  }
}
