import { IsIn, IsOptional, IsString } from 'class-validator';

export type ReportsPeriod = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export class ReportsFilterRequest {
  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsOptional()
  @IsString()
  leaderCode?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @IsString()
  incidentType?: string;

  @IsOptional()
  @IsString()
  reportMonth?: string;

  @IsOptional()
  @IsString()
  reportYear?: string;

  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly', 'yearly'])
  period?: ReportsPeriod;

  @IsOptional()
  @IsString()
  referenceDate?: string;
}

export class ReportsSummaryResponse {
  open!: number;
  inProgress!: number;
  closed!: number;
  total!: number;
  compliancePct!: number;
}

export class ReportsStatusPoint {
  status!: 'open' | 'in_progress' | 'closed';
  label!: string;
  value!: number;
}

export class ReportsAreaPoint {
  areaCode!: string;
  areaName?: string;
  open!: number;
  inProgress!: number;
  closed!: number;
  total!: number;
}

export class MonthlyAreaPoint {
  month!: string;       // 'ENERO' … 'DICIEMBRE'
  monthIndex!: number;  // 1-12
  areaCode!: string;
  areaName!: string;
  open!: number;
  inProgress!: number;
  closed!: number;
  total!: number;
}

export class AnnualByAreaResponse {
  year!: number;
  areas!: string[];          // códigos de área presentes
  areaNames!: Record<string, string>;
  months!: MonthlyAreaPoint[];
}

export class ReportsAnalyticsResponse {
  summary!: ReportsSummaryResponse;
  period!: ReportsPeriod;
  rangeLabel!: string;
  byStatus!: ReportsStatusPoint[];
  byArea!: ReportsAreaPoint[];
}

export class ReportsMapper {}
