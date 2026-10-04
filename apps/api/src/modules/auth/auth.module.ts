import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password/password.service';
import { OtpService } from './otp/otp.service';
import { OTP_STORE, InMemoryOtpStore } from './otp/otp-store';
import { OTP_PROVIDER, DevOtpProvider } from './otp/otp-provider';
import { TokenService } from './tokens/token.service';
import {
  REFRESH_TOKEN_REPOSITORY,
  PrismaRefreshTokenRepository,
} from './tokens/refresh-token.repository';
import { SALON_MEMBERSHIP, PrismaSalonMembershipChecker } from './salon-membership.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SalonScopeGuard } from './guards/salon-scope.guard';

/**
 * Authentication + authorization foundation.
 *
 * Dev seams (swap in later phases): OTP storage is in-memory (Redis in production),
 * the OTP provider is the dev stub (SMS provider later). Throttling uses the default
 * in-memory store (foundation for login + OTP abuse protection).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessTtl },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    OtpService,
    TokenService,
    { provide: OTP_STORE, useClass: InMemoryOtpStore },
    { provide: OTP_PROVIDER, useClass: DevOtpProvider },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: SALON_MEMBERSHIP, useClass: PrismaSalonMembershipChecker },
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    SalonScopeGuard,
  ],
  exports: [
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    SalonScopeGuard,
    TokenService,
    SALON_MEMBERSHIP,
  ],
})
export class AuthModule {}
