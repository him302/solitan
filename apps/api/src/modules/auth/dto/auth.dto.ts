import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

/** Request-validation DTOs (class-validator). Shared response contracts live in
 * @soliton/api-contract. The global ValidationPipe rejects unexpected properties. */

export class RequestOtpDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
