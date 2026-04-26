import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { AuditLogDetail, AuditLogFilterRequest, AuditLogListItem, AuditLogMapper } from '../mapper/audit-log.mapper';
import { AuditLogService } from '../service/audit-log.service';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query() query: AuditLogFilterRequest,
  ): Promise<ApiResponse<{ items: AuditLogListItem[]; total: number; page: number; pageSize: number; totalPages: number }>> {
    const result = await this.auditLogService.findAll(query);
    return new ApiResponse(true, 'Auditoría obtenida correctamente', {
      ...result,
      items: result.items.map(AuditLogMapper.toListItem),
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<AuditLogDetail | null>> {
    const entry = await this.auditLogService.findById(id);
    return new ApiResponse(
      true,
      entry ? 'Entrada de auditoría obtenida' : 'No encontrada',
      entry ? AuditLogMapper.toDetail(entry) : null,
    );
  }
}
