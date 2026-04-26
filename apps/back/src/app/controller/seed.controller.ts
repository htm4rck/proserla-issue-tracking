import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { SeedService } from '../service/seed.service';
import { SeedRunPayload } from '../service/seed.types';

@ApiTags('seed')
@Controller('dev/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  async run(): Promise<ApiResponse<SeedRunPayload>> {
    const payload = await this.seedService.run();
    return new ApiResponse(true, 'Semilla aplicada correctamente', payload);
  }
}
