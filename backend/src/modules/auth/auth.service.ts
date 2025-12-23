import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokensDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    // Get city - use provided or first available
    let cityId = dto.cityId;
    if (!cityId) {
      const firstCity = await this.prisma.city.findFirst();
      if (!firstCity) {
        throw new BadRequestException('No cities available');
      }
      cityId = firstCity.id;
    } else {
      const city = await this.prisma.city.findUnique({
        where: { id: cityId },
      });
      if (!city) {
        throw new BadRequestException('Invalid city');
      }
    }

    const prepSchool = await this.prisma.location.findFirst({
      where: {
        cityId: cityId,
        type: 'prep_school',
      },
      include: {
        classes: {
          orderBy: { gradeNumber: 'asc' },
          take: 1,
        },
      },
    });

    if (!prepSchool || prepSchool.classes.length === 0) {
      throw new BadRequestException('City not properly configured');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const subjects = await this.prisma.subject.findMany();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        character: {
          create: {
            cityId: cityId,
            currentLocationId: prepSchool.id,
            currentClassId: prepSchool.classes[0].id,
            subjects: {
              create: subjects.map((subject) => ({
                subjectId: subject.id,
                level: 1,
                currentXp: 0,
              })),
            },
            locationProgress: {
              create: {
                locationId: prepSchool.id,
                completionPercent: 0,
                isCompleted: false,
              },
            },
            dailyReward: {
              create: {
                currentDay: 1,
              },
            },
          },
        },
      },
    });

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }

  async refresh(userId: string): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }

  private generateTokens(payload: { sub: string; email: string; username: string }): TokensDto {
    const accessTokenExpiry = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessTokenExpiry as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiry as any,
    });

    return { accessToken, refreshToken };
  }
}
