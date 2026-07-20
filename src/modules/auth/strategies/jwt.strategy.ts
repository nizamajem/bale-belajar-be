import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser } from "../../../common/types/authenticated-user.type";
import { AuthTokenPayload } from "../types/auth-token-payload.type";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_ACCESS_SECRET", "replace_me"),
    });
  }

  validate(payload: AuthTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      role: payload.role,
      schoolId: payload.schoolId,
      teacherProfileId: payload.teacherProfileId,
      studentProfileId: payload.studentProfileId,
    };
  }
}

