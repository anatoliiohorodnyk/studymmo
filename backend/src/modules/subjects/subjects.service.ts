import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
