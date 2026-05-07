import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { InspectionImageService } from '../service/inspection-image.service';
import { UploadService } from '../service/upload.service';

/** Evita depender de @types/multer (Express 5 no exporta Multer en el namespace). */
type UploadedFilePayload = { buffer: Buffer; originalname: string; mimetype: string };

class CreateResponseBody {
  inspectionCode!: string;
  status!: string;
  imageType!: string;
  url!: string;
  storagePath?: string;
  uploadedBy?: string;
  comment?: string;
}

@ApiTags('inspection-images')
@Controller('inspection-images')
export class InspectionImageController {
  constructor(
    private readonly imageService: InspectionImageService,
    private readonly uploadService: UploadService,
  ) {}

  /** Registra una respuesta/evidencia con URL ya conocida */
  @Post()
  async create(@Body() payload: CreateResponseBody) {
    const entity = await this.imageService.create({ ...payload, uploadOk: true });
    return new ApiResponse(true, 'Evidencia registrada correctamente', entity);
  }

  /**
   * Sube un archivo al bridge PHP y persiste el resultado.
   * Si el PHP falla, igual persiste con uploadOk=false y devuelve el error en el mensaje.
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Body() body: { inspectionCode: string; imageType: 'report' | 'closure'; uploadedBy?: string; comment?: string; status?: string },
  ) {
    if (!file?.buffer?.length) {
      return new ApiResponse(false, 'No se recibió ningún archivo', null);
    }
    const uploadResult = await this.uploadService.uploadToPhpBridge({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      inspectionCode: body.inspectionCode,
      imageType: body.imageType ?? 'report',
    });

    const url = uploadResult.url ?? `pending://${body.inspectionCode}/${file.originalname}`;
    const entity = await this.imageService.create({
      inspectionCode: body.inspectionCode,
      status: body.status ?? 'open',
      imageType: body.imageType ?? 'report',
      url,
      storagePath: uploadResult.storagePath,
      uploadedBy: body.uploadedBy,
      comment: body.comment,
      uploadOk: uploadResult.ok,
      uploadError: uploadResult.error,
    });

    const message = uploadResult.ok
      ? 'Archivo subido y evidencia registrada correctamente'
      : `Evidencia registrada pero el upload al servidor de archivos falló: ${uploadResult.error}`;

    return new ApiResponse(uploadResult.ok, message, entity);
  }

  @Get(':inspectionCode')
  async findByInspectionCode(@Param('inspectionCode') inspectionCode: string) {
    const images = await this.imageService.findByInspectionCode(inspectionCode);
    return new ApiResponse(true, 'Listado de evidencias obtenido correctamente', images);
  }
}
