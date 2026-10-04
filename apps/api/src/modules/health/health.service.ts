import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@soliton/api-contract';

const SERVICE_NAME = 'soliton-api';
const SERVICE_VERSION = process.env.npm_package_version ?? '0.0.0';

/** Builds process-level health payloads. No external dependencies are checked yet. */
@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
