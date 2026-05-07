export interface SeedRoleInfo {
  code: string;
  name: string;
  paraQueSirve: string;
}

export interface SeedAreaInfo {
  code: string;
  name: string;
  paraQueSirve: string;
}

export interface SeedLeaderInfo {
  code: string;
  fullName: string;
  areaCode: string;
  email: string;
  paraQueSirve: string;
  /** Áreas adicionales (además de areaCode primaria) */
  extraAreaCodes?: string[];
}

export interface SeedDemoUserInfo {
  email: string;
  fullName: string;
  roleCode: string;
  areaCode: string;
  leaderCode: string;
  nota: string;
  /** Áreas adicionales con su líder correspondiente */
  extraAreas?: Array<{ areaCode: string; leaderCode?: string }>;
}

export interface SeedRunPayload {
  resumen: string;
  comoLeerElModelo: { titulo: string; texto: string }[];
  roles: SeedRoleInfo[];
  areas: SeedAreaInfo[];
  lideres: SeedLeaderInfo[];
  usuariosDemo: SeedDemoUserInfo[];
  inspeccionesDemo: string[];
  conteos: {
    roles: number;
    areas: number;
    lideres: number;
    usuarios: number;
    catalogos: number;
    inspecciones: number;
  };
}
