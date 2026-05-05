import { IncidentStatus } from '../enum/incident-status.enum';
import { SeedAreaInfo, SeedDemoUserInfo, SeedLeaderInfo, SeedRoleInfo } from './seed.types';

export const DEMO_PASSWORD = 'demo1234';

export const SEED_ROLES: SeedRoleInfo[] = [
  { code: 'admin', name: 'Administrador', paraQueSirve: 'Ve todo el sistema, configura catalogos, usuarios, reportes y puede corregir datos.' },
  { code: 'leader', name: 'Lider de area', paraQueSirve: 'Gestiona incidencias de su area/equipo, da seguimiento y valida cierres.' },
  { code: 'operator', name: 'Operador', paraQueSirve: 'Registra incidencias y consulta el avance de sus reportes.' },
  { code: 'viewer', name: 'Consulta', paraQueSirve: 'Perfil de solo lectura para auditoria o gerencia.' },
];

export const SEED_AREAS: SeedAreaInfo[] = [
  { code: 'PACK', name: 'Empaque', paraQueSirve: 'Lineas de empaque, seleccion y despacho.' },
  { code: 'FIELD', name: 'Campo', paraQueSirve: 'Operaciones agricolas y visitas en terreno.' },
  { code: 'PLANT', name: 'Planta', paraQueSirve: 'Produccion industrial y mantenimiento.' },
  { code: 'LOG', name: 'Logistica', paraQueSirve: 'Patio, montacargas, carga y transporte interno.' },
  { code: 'QA', name: 'Calidad', paraQueSirve: 'Laboratorio, inspeccion y control de calidad.' },
  { code: 'HSE', name: 'Seguridad y salud', paraQueSirve: 'Equipo HSE, auditoria y soporte operativo.' },
];

export const SEED_LEADERS: SeedLeaderInfo[] = [
  { code: 'LUCIA', fullName: 'Lucia Asto', areaCode: 'PACK', email: 'lucia@demo.local', paraQueSirve: 'Lider de Empaque.' },
  { code: 'MARIO', fullName: 'Mario Quispe', areaCode: 'FIELD', email: 'mario@demo.local', paraQueSirve: 'Lider de Campo.' },
  { code: 'ROSA', fullName: 'Rosa Delgado', areaCode: 'PLANT', email: 'rosa@demo.local', paraQueSirve: 'Lider de Planta.' },
  { code: 'MANUEL', fullName: 'Manuel Paredes', areaCode: 'LOG', email: 'manuel@demo.local', paraQueSirve: 'Lider de Logistica.' },
  { code: 'DIANA', fullName: 'Diana Diaz', areaCode: 'QA', email: 'diana@demo.local', paraQueSirve: 'Lider de Calidad.' },
  {
    code: 'CARLOS',
    fullName: 'Carlos Melendez',
    areaCode: 'HSE',
    email: 'carlos@demo.local',
    paraQueSirve: 'Responsable HSE — cubre HSE y QA (ejemplo multi-area).',
    extraAreaCodes: ['QA'],
  },
];

export const SEED_DEMO_USERS: SeedDemoUserInfo[] = [
  { email: 'admin@demo.local', fullName: 'Admin Demo', roleCode: 'admin', areaCode: 'HSE', leaderCode: 'CARLOS', nota: `Password: ${DEMO_PASSWORD}. Administrador global.` },
  { email: 'lider@demo.local', fullName: 'Lider Demo', roleCode: 'leader', areaCode: 'PACK', leaderCode: 'LUCIA', nota: `Password: ${DEMO_PASSWORD}. Lider PACK.` },
  { email: 'operador@demo.local', fullName: 'Operador Demo', roleCode: 'operator', areaCode: 'FIELD', leaderCode: 'MARIO', nota: `Password: ${DEMO_PASSWORD}. Operador FIELD.` },
  { email: 'lucia@demo.local', fullName: 'Lucia Asto', roleCode: 'leader', areaCode: 'PACK', leaderCode: 'LUCIA', nota: `Password: ${DEMO_PASSWORD}. Lider real de Empaque.` },
  { email: 'mario@demo.local', fullName: 'Mario Quispe', roleCode: 'leader', areaCode: 'FIELD', leaderCode: 'MARIO', nota: `Password: ${DEMO_PASSWORD}. Lider real de Campo.` },
  { email: 'rosa@demo.local', fullName: 'Rosa Delgado', roleCode: 'leader', areaCode: 'PLANT', leaderCode: 'ROSA', nota: `Password: ${DEMO_PASSWORD}. Lider real de Planta.` },
  { email: 'manuel@demo.local', fullName: 'Manuel Paredes', roleCode: 'leader', areaCode: 'LOG', leaderCode: 'MANUEL', nota: `Password: ${DEMO_PASSWORD}. Lider real de Logistica.` },
  { email: 'diana@demo.local', fullName: 'Diana Diaz', roleCode: 'leader', areaCode: 'QA', leaderCode: 'DIANA', nota: `Password: ${DEMO_PASSWORD}. Lider real de Calidad.` },
  { email: 'ana.operador@demo.local', fullName: 'Ana Rojas', roleCode: 'operator', areaCode: 'PACK', leaderCode: 'LUCIA', nota: `Password: ${DEMO_PASSWORD}. Operadora Empaque.` },
  { email: 'miguel.operador@demo.local', fullName: 'Miguel Coronado', roleCode: 'operator', areaCode: 'LOG', leaderCode: 'MANUEL', nota: `Password: ${DEMO_PASSWORD}. Operador Logistica.` },
  { email: 'wilfredo.operador@demo.local', fullName: 'Wilfredo Fernandez', roleCode: 'operator', areaCode: 'PLANT', leaderCode: 'ROSA', nota: `Password: ${DEMO_PASSWORD}. Operador Planta.` },
  { email: 'auditor@demo.local', fullName: 'Auditor Demo', roleCode: 'viewer', areaCode: 'HSE', leaderCode: 'CARLOS', nota: `Password: ${DEMO_PASSWORD}. Consulta.` },
];

export interface SeedIncidentBase {
  incidentCode: string;
  reportedBy: string;
  reportYear?: number;
  reportMonth?: string;
  reportDay?: number;
  reportTime?: string;
  site?: string;
  reportedPerson?: string;
  reportedPersonAge?: string;
  employerType?: string;
  areaCode: string;
  leaderCode: string;
  assignedTo: string;
  location: string;
  workArea?: string;
  incidentType: 'act' | 'condition';
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  comment?: string;
  reportSource?: string;
  correctiveMeasures?: string;
  status: IncidentStatus;
}

const baseRows: Array<Omit<SeedIncidentBase, 'incidentCode'>> = [
  { reportedBy: 'Miguel Coronado', areaCode: 'LOG', leaderCode: 'MANUEL', assignedTo: 'Supervisor de patio', location: 'Parqueo de montacargas', workArea: 'Patio logistico', incidentType: 'condition', riskLevel: 'high', description: 'Caja de carton abierta y plasticos depositados en area de maniobra de montacargas.', correctiveMeasures: 'Retirar materiales y mantener despejada la zona de transito.', status: IncidentStatus.OPEN },
  { reportedBy: 'Miguel Coronado', areaCode: 'LOG', leaderCode: 'MANUEL', assignedTo: 'Mantenimiento', location: 'Parqueo de montacargas', workArea: 'Patio logistico', incidentType: 'condition', riskLevel: 'medium', description: 'Piso contaminado con liquidos en zona de circulacion.', correctiveMeasures: 'Limpiar derrame y verificar fuga en equipo cercano.', status: IncidentStatus.IN_PROGRESS },
  { reportedBy: 'Wilfredo Fernandez', areaCode: 'PLANT', leaderCode: 'ROSA', assignedTo: 'Taller mantenimiento', location: 'Nave de palta', workArea: 'Linea de proceso', incidentType: 'condition', riskLevel: 'high', description: 'Canaleta electrica con cables expuestos.', correctiveMeasures: 'Restringir acceso, senalizar y reponer canaleta.', status: IncidentStatus.OPEN },
  { reportedBy: 'Ana Rojas', areaCode: 'PACK', leaderCode: 'LUCIA', assignedTo: 'Jefe de linea 2', location: 'Linea 2 - empaque', workArea: 'Empaque', incidentType: 'act', riskLevel: 'medium', description: 'Operador manipula jabas sin guantes de seguridad.', correctiveMeasures: 'Reforzar uso de EPP y validar entrega de guantes.', status: IncidentStatus.CLOSED },
  { reportedBy: 'Operador Demo', areaCode: 'FIELD', leaderCode: 'MARIO', assignedTo: 'Cuadrilla campo norte', location: 'Campo Norte', workArea: 'Cosecha', incidentType: 'act', riskLevel: 'high', description: 'Ingreso a zona de trabajo sin EPP completo.', correctiveMeasures: 'Charla de cinco minutos y control de ingreso.', status: IncidentStatus.IN_PROGRESS },
  { reportedBy: 'Diana Diaz', areaCode: 'QA', leaderCode: 'DIANA', assignedTo: 'Laboratorio QA', location: 'Laboratorio fisicoquimico', workArea: 'Calidad', incidentType: 'condition', riskLevel: 'low', description: 'Etiqueta de producto quimico parcialmente ilegible.', correctiveMeasures: 'Reetiquetar envase y revisar almacenamiento.', status: IncidentStatus.CLOSED },
  { reportedBy: 'Carlos Melendez', areaCode: 'HSE', leaderCode: 'CARLOS', assignedTo: 'Brigada emergencia', location: 'Gabinete contra incendio 3', workArea: 'Seguridad', incidentType: 'condition', riskLevel: 'high', description: 'Acceso a gabinete obstruido por pallets.', correctiveMeasures: 'Retirar pallets y demarcar area libre permanente.', status: IncidentStatus.OPEN },
  { reportedBy: 'Miguel Coronado', areaCode: 'LOG', leaderCode: 'MANUEL', assignedTo: 'Operador montacargas', location: 'Zona de carga', workArea: 'Despacho', incidentType: 'act', riskLevel: 'medium', description: 'Montacargas circula con alarma sonora intermitente.', correctiveMeasures: 'Retirar equipo de servicio y reportar a mantenimiento.', status: IncidentStatus.CLOSED },
];

const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO'];

export const SEED_INCIDENTS: SeedIncidentBase[] = Array.from({ length: 32 }, (_, idx) => {
  const row = baseRows[idx % baseRows.length];
  const n = idx + 1;
  return {
    ...row,
    incidentCode: `INC-2026-${String(n).padStart(3, '0')}`,
    reportYear: 2026,
    reportMonth: months[idx % months.length],
    reportDay: (idx % 24) + 1,
    reportTime: `${String(8 + (idx % 9)).padStart(2, '0')}:${idx % 2 === 0 ? '15' : '45'}`,
    site:
      idx % 6 === 0
        ? 'PLANTA'
        : idx % 6 === 1
          ? 'FUNDO TARATA'
          : idx % 6 === 2
            ? 'FUNDO MASARIS'
            : idx % 6 === 3
              ? 'FUNDO CARMELO'
              : idx % 6 === 4
                ? 'FUNDO LA VIÑA'
                : 'FUNDO SANTA LUCÍA',
    reportedPerson: idx % 4 === 0 ? 'NA' : 'Personal operativo',
    reportedPersonAge: idx % 4 === 0 ? 'NA' : String(24 + (idx % 18)),
    employerType: idx % 5 === 0 ? 'TERCERO' : 'PROSERLA',
    reportSource: idx % 2 === 0 ? 'WHATSAPP' : 'CHECK LIST',
  };
});
