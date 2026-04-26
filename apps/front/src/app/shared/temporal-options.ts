export interface OptionItem {
  value: string;
  label: string;
}

export const MONTH_OPTIONS: OptionItem[] = [
  { value: 'ENERO', label: 'Enero' },
  { value: 'FEBRERO', label: 'Febrero' },
  { value: 'MARZO', label: 'Marzo' },
  { value: 'ABRIL', label: 'Abril' },
  { value: 'MAYO', label: 'Mayo' },
  { value: 'JUNIO', label: 'Junio' },
  { value: 'JULIO', label: 'Julio' },
  { value: 'AGOSTO', label: 'Agosto' },
  { value: 'SEPTIEMBRE', label: 'Septiembre' },
  { value: 'OCTUBRE', label: 'Octubre' },
  { value: 'NOVIEMBRE', label: 'Noviembre' },
  { value: 'DICIEMBRE', label: 'Diciembre' },
];

export function yearOptions(fromYear = 2020, toYear = new Date().getFullYear()): string[] {
  const start = Math.min(fromYear, toYear);
  const end = Math.max(fromYear, toYear);
  const years: string[] = [];
  for (let y = end; y >= start; y -= 1) years.push(String(y));
  return years;
}
