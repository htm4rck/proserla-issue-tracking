/** Textos visibles en español para valores técnicos que vienen del API. */

export function etiquetaEstadoIncidencia(status: string): string {
  switch (status) {
    case 'open':
      return 'Pendiente';
    case 'in_progress':
      return 'En proceso';
    case 'closed':
      return 'Cerrada';
    default:
      return status;
  }
}

export function etiquetaNivelRiesgo(risk: string): string {
  switch (risk) {
    case 'low':
      return 'Bajo';
    case 'medium':
      return 'Medio';
    case 'high':
      return 'Alto';
    default:
      return risk;
  }
}

export function etiquetaTipoIncidencia(tipo: string): string {
  switch (tipo) {
    case 'act':
      return 'Acto inseguro';
    case 'condition':
      return 'Condición insegura';
    default:
      return tipo;
  }
}

/** Agrupa ítems en la tabla `catalog_items` (ej. tipos de incidencia, niveles de riesgo). */
export function etiquetaTipoCatalogo(catalogType: string): string {
  switch (catalogType) {
    case 'incident_type':
      return 'Tipo de incidencia';
    case 'risk_level':
      return 'Nivel de riesgo';
    default:
      return catalogType;
  }
}

export function etiquetaRol(codigo: string): string {
  switch (codigo) {
    case 'admin':
      return 'Administrador';
    case 'leader':
      return 'Líder de equipo';
    case 'aux_sst':
      return 'Auxiliar SST';
    case 'operator':
      return 'Auxiliar SST';
    default:
      return codigo;
  }
}
