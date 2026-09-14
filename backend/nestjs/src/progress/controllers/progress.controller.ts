import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Observable, map } from "rxjs";
import { ProgressService } from "../services/progress.service";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/shared/decorators/currentUserDecorator.decorator";
import { UsersService } from "@/users/services/users.service";
import { DURACION_URL_FIRMADA_S, firmaRuta, firmaValida } from "@/minio/signed-url";

interface MessageEvent {
  data: string | object;
}

// "progress:" keeps these signatures apart from file ones, whose routes are "<hex hash>/<file>" (no ':').
const rutaFirmada = (requestHash: string) => `progress:${requestHash}`;

@Controller("progress")
export class ProgressController {
  private readonly logger = new Logger(ProgressController.name);

  constructor(
    private readonly progressService: ProgressService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Signed, expiring stream URL for the owner of the request (WEB-210): EventSource cannot send Authorization
   * @returns URL relative to the API root
   */
  @Get("stream-url/:requestHash")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async streamUrl(
    @Param("requestHash") requestHash: string,
    @CurrentUser("id") userId: string
  ): Promise<{ url: string }> {
    const propias = await this.usersService.getRequestHashesByUserId(userId);
    if (!propias.includes(requestHash)) {
      throw new NotFoundException(`Request not found: ${requestHash}`);
    }

    const expires = Math.floor(Date.now() / 1000) + DURACION_URL_FIRMADA_S;
    const sig = firmaRuta(rutaFirmada(requestHash), expires, this.configService.get<string>("JWT_SECRET") ?? "");
    return { url: `/progress/stream/${encodeURIComponent(requestHash)}?expires=${expires}&sig=${sig}` };
  }

  /**
   * SSE endpoint to stream the progress of one request
   * @returns Observable of MessageEvent objects
   */
  @Sse("stream/:requestHash")
  streamProgress(
    @Param("requestHash") requestHash: string,
    @Query("expires") expires: string,
    @Query("sig") sig: string
  ): Observable<MessageEvent> {
    const secreto = this.configService.get<string>("JWT_SECRET");
    if (!secreto || !firmaValida(rutaFirmada(requestHash), expires, sig, secreto)) {
      throw new ForbiddenException("Invalid or expired progress URL");
    }
    this.logger.log(`Client connected to progress stream of ${requestHash}`);

    return this.progressService.progressOf(requestHash).pipe(
      map((progressEvent: ProgressEvent) => ({
        data: {
          increment: progressEvent.increment,
          message: progressEvent.message,
          timestamp: new Date().toISOString(),
          completed: progressEvent.increment >= MAX_PROGRESS,
          error: progressEvent.error,
        },
      }))
    );
  }
}
