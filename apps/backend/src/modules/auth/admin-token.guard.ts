import { createHash, timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Fail-closed temporary operator authentication for write/admin endpoints.
 * MOMAP_ADMIN_TOKEN must be a randomly generated secret of at least 32 characters.
 * Not a replacement for users, sessions or organization-scoped authorization.
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("MOMAP_ADMIN_TOKEN");
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException("Administrative access is not configured.");
    }

    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string | string[] };
    }>();
    const authorization = request.headers?.authorization;
    if (typeof authorization !== "string" || authorization.length > 520) {
      throw new UnauthorizedException("Administrative authorization required.");
    }
    const match = /^Bearer (\S+)$/.exec(authorization);
    if (!match) {
      throw new UnauthorizedException("Administrative authorization required.");
    }

    // Equal-length hashes avoid timing differences from comparing variable-length tokens.
    const actual = createHash("sha256").update(match[1]).digest();
    const expected = createHash("sha256").update(secret).digest();
    if (!timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Administrative authorization required.");
    }
    return true;
  }
}
