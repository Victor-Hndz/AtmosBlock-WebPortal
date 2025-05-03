import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "@/shared/interfaces/jwtPayloadInterface.interface";

export const CurrentUser = createParamDecorator((data: keyof JwtPayload | undefined, ctx: ExecutionContext): any => {
  const request = ctx.switchToHttp().getRequest();
  const user: JwtPayload = request.user;

  return data ? user?.[data] : user;
});
