import { Controller, Get, Header, Headers, Query, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  ReportsAnalyticsResponse,
  ReportsFilterRequest,
  ReportsSummaryResponse,
} from '../mapper/reports.mapper';
import { ReportsService } from '../service/reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async summary(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<ReportsSummaryResponse>> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const data = await this.reportsService.summary(scoped);
    return new ApiResponse(true, 'Resumen de reportes generado correctamente', data);
  }

  @Get('analytics')
  async analytics(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<ReportsAnalyticsResponse>> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const data = await this.reportsService.analytics(scoped);
    return new ApiResponse(true, 'Analitica de reportes generada correctamente', data);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="incidents-report.csv"')
  async exportCsv(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<string> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    return this.reportsService.exportCsv(scoped);
  }

  @Get('export.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="incidents-report.xlsx"')
  async exportXlsx(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<StreamableFile> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const buffer = await this.reportsService.exportXlsx(scoped);
    return new StreamableFile(buffer);
  }

  /** @deprecated Prefer export.xlsx (libro real). Se mantiene por compatibilidad. */
  @Get('export.xls')
  @Header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="incidents-report.xls"')
  async exportExcel(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<string> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    return this.reportsService.exportExcel(scoped);
  }

  @Get('export.pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="incidents-report.pdf"')
  async exportPdf(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<StreamableFile> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const buffer = await this.reportsService.exportPdf(scoped);
    return new StreamableFile(buffer);
  }

  @Get('tabla.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async tablaHtml(
    @Query() query: ReportsFilterRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<string> {
    const scoped = { ...query };
    if (roleCode === 'leader') {
      scoped.areaCode = areaCodeHeader || query.areaCode;
      scoped.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    return this.reportsService.exportPrintableHtml(scoped);
  }
}
