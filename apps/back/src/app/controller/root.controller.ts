import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  @Header('Content-Type', 'application/json')
  root() {
    return {
      platform: 'Tordo',
      website: 'https://tordo.io',
      description: 'Soluciones de integracion empresarial',
      product: 'RACI - REGISTROS DE ACTOS Y CONDICIONES INSEGURAS',
      version: '1.0.0',
      status: 'operational',
    };
  }
}
