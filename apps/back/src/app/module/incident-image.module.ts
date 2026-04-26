import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentImageController } from '../controller/incident-image.controller';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentImageService } from '../service/incident-image.service';
import { UploadService } from '../service/upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncidentResponseEntity]),
    MulterModule.register({ storage: undefined }), // memory storage (buffer)
  ],
  controllers: [IncidentImageController],
  providers: [IncidentImageService, UploadService],
  exports: [IncidentImageService],
})
export class IncidentImageModule {}
