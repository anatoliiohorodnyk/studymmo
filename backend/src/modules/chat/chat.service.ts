import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_MESSAGES = 50;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages() {
    const messages = await this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES,
    });

    return messages.reverse().map((msg) => ({
      id: msg.id,
      username: msg.username,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    }));
  }

  async sendMessage(userId: string, message: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { user: { select: { username: true } } },
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        characterId: character.id,
        username: character.user.username,
        message: message.trim(),
      },
    });

    // Cleanup old messages (keep only last 50)
    const count = await this.prisma.chatMessage.count();
    if (count > MAX_MESSAGES) {
      const oldMessages = await this.prisma.chatMessage.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - MAX_MESSAGES,
        select: { id: true },
      });

      await this.prisma.chatMessage.deleteMany({
        where: { id: { in: oldMessages.map((m) => m.id) } },
      });
    }

    return {
      id: chatMessage.id,
      username: chatMessage.username,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt.toISOString(),
    };
  }
}
