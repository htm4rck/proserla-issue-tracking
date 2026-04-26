import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResponse<{ service: string }> {
    return new ApiResponse(true, 'Servicio operativo', {
      service: 'issue-tracking-api',
    });
  }
}
