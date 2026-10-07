import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createComplaintSchema,
  type CreateComplaintInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { ComplaintsService } from './complaints.service';

@Controller({ path: 'complaints', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  /** POST /complaints */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createComplaintSchema)) body: CreateComplaintInput,
  ) {
    return this.complaints.create(user.id, body);
  }
}

@Controller({ path: 'me/complaints', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class MyComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  /** GET /me/complaints */
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complaints.listMine(user.id, cursor, limit ? parseInt(limit, 10) : 20);
  }

  /** GET /me/complaints/:id */
  @Get(':id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaints.getOne(user.id, id);
  }
}
