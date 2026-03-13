import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ChallengesModule } from './challenges/challenges.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { JwtCookieGuard } from './common/guards/jwt-cookie.guard';
import { DatabaseModule } from './database/database.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { MatchesModule } from './matches/matches.module';
import { PlayersModule } from './players/players.module';
import { RankingModule } from './ranking/ranking.module';

@Module({
  imports: [DatabaseModule, AuthModule, HealthModule, PlayersModule, ChallengesModule, MatchesModule, RankingModule, DashboardModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtCookieGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
