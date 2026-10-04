import { Injectable } from '@nestjs/common';
import type { CreateServiceInput, ServiceDto, UpdateServiceInput } from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';
import { serviceNotFound } from '../../common/errors/domain.exception';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SalonAccessService } from '../salons/salon-access.service';
import { toServiceDto } from '../salons/salon-mapper';

/**
 * Salon service catalogue. A service is ALWAYS looked up as (serviceId AND salonId) so a
 * service id belonging to another salon is indistinguishable from a missing one.
 * Services are deactivated, never deleted: future queue entries and appointments will
 * reference them, and history must stay intact.
 */
@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SalonAccessService,
  ) {}

  /** Members (and admin) see every service; everyone else sees active ones only. */
  async list(viewer: RequestUser | undefined, salonId: string): Promise<ServiceDto[]> {
    const { isMember } = await this.access.resolveVisibility(viewer, salonId);
    const services = await this.prisma.service.findMany({
      where: isMember ? { salonId } : { salonId, active: true },
      orderBy: { name: 'asc' },
    });
    return services.map(toServiceDto);
  }

  async get(
    viewer: RequestUser | undefined,
    salonId: string,
    serviceId: string,
  ): Promise<ServiceDto> {
    const { isMember } = await this.access.resolveVisibility(viewer, salonId);
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, salonId } });
    if (!service || (!service.active && !isMember)) throw serviceNotFound();
    return toServiceDto(service);
  }

  async create(user: RequestUser, salonId: string, input: CreateServiceInput): Promise<ServiceDto> {
    await this.access.assertManager(user, salonId);
    const service = await this.prisma.service.create({
      data: {
        salonId, // from the verified route scope, never from the body
        name: input.name,
        priceCents: input.priceCents,
        estimatedMinutes: input.estimatedMinutes,
        active: input.active ?? true,
      },
    });
    logger.info(
      { event: 'service_created', salonId, serviceId: service.id, userId: user.id },
      'service_created',
    );
    return toServiceDto(service);
  }

  async update(
    user: RequestUser,
    salonId: string,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<ServiceDto> {
    await this.access.assertManager(user, salonId);
    const existing = await this.prisma.service.findFirst({ where: { id: serviceId, salonId } });
    if (!existing) throw serviceNotFound();

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.priceCents !== undefined && { priceCents: input.priceCents }),
        ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
        ...(input.active !== undefined && { active: input.active }),
      },
    });

    const event =
      input.active === false && existing.active ? 'service_deactivated' : 'service_updated';
    logger.info({ event, salonId, serviceId, userId: user.id }, event);
    return toServiceDto(service);
  }

  /** DELETE semantics: soft deactivation (idempotent). */
  async deactivate(user: RequestUser, salonId: string, serviceId: string): Promise<ServiceDto> {
    return this.update(user, salonId, serviceId, { active: false });
  }
}
