import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionImageController } from '../controller/inspection-image.controller';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionImageService } from '../service/inspection-image.service';
import { UploadService } from '../service/upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InspectionResponseEntity]),
    MulterModule.register({ storage: undefined }), // memory storage (buffer)
  ],
  controllers: [InspectionImageController],
  providers: [InspectionImageService, UploadService],
  exports: [InspectionImageService],
})
export class InspectionImageModule {}
