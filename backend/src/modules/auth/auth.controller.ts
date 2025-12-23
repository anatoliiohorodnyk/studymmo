import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokensDto, RefreshTokenDto } from './dto/tokens.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<TokensDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokensDto> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Body() _dto: RefreshTokenDto,
  ): Promise<TokensDto> {
    return this.authService.refresh(user.sub as string);
  }
}
