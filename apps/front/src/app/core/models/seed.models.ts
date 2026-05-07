export interface SeedRunPayload {
  resumen: string;
  comoLeerElModelo: { titulo: string; texto: string }[];
  roles: { code: string; name: string; paraQueSirve: string }[];
  areas: { code: string; name: string; paraQueSirve: string }[];
  lideres: { code: string; fullName: string; areaCode: string; email: string; paraQueSirve: string }[];
  usuariosDemo: {
    email: string;
    fullName: string;
    roleCode: string;
    areaCode: string;
    leaderCode: string;
    nota: string;
  }[];
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
