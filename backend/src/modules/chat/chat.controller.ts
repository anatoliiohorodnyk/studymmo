import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getMessages() {
    return this.chatService.getMessages();
  }

  @Post()
  async sendMessage(
    @CurrentUser() user: { sub: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.sub, dto.message);
  }
}
