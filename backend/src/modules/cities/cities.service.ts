import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }
}
