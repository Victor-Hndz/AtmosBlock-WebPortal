import { ExtractJwt, Strategy } from "passport-jwt";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "@/users/services/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    const secretKey = configService.get<string>("JWT_SECRET");
    if (!secretKey) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretKey,
    });
  }

  async validate(payload: { sub: string }) {
    // WEB-201 (V7): identity and role come from the database, so revoking a role takes effect at once.
    const user = await this.usersService.findOne(payload.sub).catch(error => {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
