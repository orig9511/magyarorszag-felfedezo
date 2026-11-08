import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AccessIdentity, AccessService } from "./access.service";
export interface AuthenticatedRequest { headers:Record<string,string|undefined>; identity?:AccessIdentity; }
@Injectable()
export class AccessGuard implements CanActivate {
 constructor(private readonly access:AccessService) {}
 async canActivate(context:ExecutionContext):Promise<boolean> {
  const req=context.switchToHttp().getRequest<AuthenticatedRequest>();
  const header=req.headers.authorization || "";
  const match=/^Bearer ([a-f0-9]{64})$/.exec(header);
  if(!match) throw new UnauthorizedException("Authentication required");
  req.identity=await this.access.authenticate(match[1]);
  return true;
 }
}
