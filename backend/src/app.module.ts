import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CharactersModule } from './modules/characters/characters.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { StudyModule } from './modules/study/study.module';
import { LocationsModule } from './modules/locations/locations.module';
import { GradesModule } from './modules/grades/grades.module';
import { CitiesModule } from './modules/cities/cities.module';
import { ItemsModule } from './modules/items/items.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { QuestsModule } from './modules/quests/quests.module';
import { OlympiadsModule } from './modules/olympiads/olympiads.module';
import { DebugModule } from './modules/debug/debug.module';
import { ChatModule } from './modules/chat/chat.module';
import { CraftingModule } from './modules/crafting/crafting.module';
import { MarketModule } from './modules/market/market.module';
import { DailyRewardsModule } from './modules/daily-rewards/daily-rewards.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CharactersModule,
    SubjectsModule,
    StudyModule,
    LocationsModule,
    GradesModule,
    CitiesModule,
    ItemsModule,
    InventoryModule,
    QuestsModule,
    OlympiadsModule,
    DebugModule,
    ChatModule,
    CraftingModule,
    MarketModule,
    DailyRewardsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
