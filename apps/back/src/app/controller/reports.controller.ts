import { Controller, Get, Header, Headers, Query, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  AnnualByAreaResponse,
  ReportsAnalyticsResponse,
  ReportsFilterRequest,
  ReportsSummaryResponse,
} from '../mapper/reports.mapper';
import { ReportsService } from '../service/reports.service';
import { InspectionConsolidatedReportService } from '../service/inspection-consolidated-report.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly consolidatedService: InspectionConsolidatedReportService,
  ) {}

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

  @Get('annual-by-area')
  async annualByArea(
    @Query('year') yearParam: string,
    @Query('areaCode') areaCode?: string,
    @Query('leaderCode') leaderCode?: string,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<AnnualByAreaResponse>> {
    const year = Number(yearParam) || new Date().getFullYear();
    const scopedArea = roleCode === 'leader' ? (areaCodeHeader || areaCode) : areaCode;
    const scopedLeader = roleCode === 'leader' ? (leaderCodeHeader || leaderCode) : leaderCode;
    const data = await this.reportsService.annualByArea(year, {
      areaCode: scopedArea,
      leaderCode: scopedLeader,
    });
    return new ApiResponse(true, 'Gráfico anual por área generado correctamente', data);
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

  /**
   * Reporte consolidado por mes y fundo/planta — formato oficial Proserla.
   * GET /api/reports/consolidated.xlsx?site=FUNDO+LA+VIÑA&reportMonth=ABRIL&reportYear=2026
   */
  @Get('consolidated.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async consolidatedXlsx(
    @Query('site') site?: string,
    @Query('reportMonth') reportMonth?: string,
    @Query('reportYear') reportYear?: string,
    @Query('areaCode') areaCode?: string,
    @Query('leaderCode') leaderCode?: string,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<StreamableFile> {
    const scopedArea   = roleCode === 'leader' ? (areaCodeHeader || areaCode) : areaCode;
    const scopedLeader = roleCode === 'leader' ? (leaderCodeHeader || leaderCode) : leaderCode;

    const month = (reportMonth ?? '').trim().toUpperCase() || undefined;
    const year  = reportYear ? Number(reportYear) : undefined;

    const sitePart   = site?.trim()   ? `-${site.trim().replace(/\s+/g, '_')}` : '';
    const monthPart  = month          ? `-${month}` : '';
    const yearPart   = year           ? `-${year}`  : '';
    const filename   = `informe-inspeccion${sitePart}${monthPart}${yearPart}.xlsx`;

    const buffer = await this.consolidatedService.generateXlsx({
      site:        site?.trim(),
      reportMonth: month,
      reportYear:  year,
      areaCode:    scopedArea,
      leaderCode:  scopedLeader,
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
