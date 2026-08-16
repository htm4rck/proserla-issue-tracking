import { createTordoApp } from '@tordo/backend';
import { AppModule } from './app/app.module';

void createTordoApp({
  module: AppModule,
  swagger: {
    title: 'API de seguimiento de inspecciones',
    description: 'Endpoints para inspecciones, evidencias, catálogos y reportes',
    version: '1.0.0',
  },
});
