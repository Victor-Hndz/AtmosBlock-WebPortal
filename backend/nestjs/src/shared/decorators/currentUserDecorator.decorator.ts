import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "@/shared/interfaces/jwtPayloadInterface.interface";

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext
  ): JwtPayload | JwtPayload[keyof JwtPayload] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    return data ? user?.[data] : user;
  }
);
