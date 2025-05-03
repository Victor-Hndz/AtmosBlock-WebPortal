import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneratedFiles } from "../entities/generatedFiles.entity";

@Injectable()
export class GeneratedFilesService {
  constructor() {} // private readonly requestRepository: Repository<Request>, // @InjectRepository(GeneratedFiles)
}
