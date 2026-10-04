import { SetMetadata } from '@nestjs/common';
import type { Role } from '@soliton/api-contract';

export const ROLES_KEY = 'soliton:roles';

/** Restricts a route/controller to the given roles (enforced by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
