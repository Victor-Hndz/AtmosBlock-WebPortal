import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedFilesService } from "./services/generatedFiles.service";
import { GeneratedFiles } from "./entities/generatedFiles.entity";

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedFiles])],
  providers: [GeneratedFiles],
  controllers: [],
  exports: [GeneratedFilesService],
})
export class GeneratedFilesModule {}
