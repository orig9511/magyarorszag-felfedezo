import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from "@nestjs/common";
import { createHash } from "node:crypto";

/** Single-instance development throttle; use shared Redis/WAF limits before production. */
@Injectable()
export class AccessThrottleGuard implements CanActivate {
 private readonly attempts=new Map<string,{count:number;until:number}>();
 canActivate(context:ExecutionContext):boolean {
  const request=context.switchToHttp().getRequest<{ip?:string;socket?:{remoteAddress?:string};headers:Record<string,string|undefined>}>();
  const address=request.socket?.remoteAddress||request.ip||"unknown";
  const key=createHash("sha256").update(address).digest("hex");
  const now=Date.now();
  const existing=this.attempts.get(key);
  const bucket=existing&&existing.until>now?existing:{count:0,until:now+60_000};
  bucket.count++;this.attempts.set(key,bucket);
  if(this.attempts.size>10000)for(const [id,value] of this.attempts)if(value.until<=now)this.attempts.delete(id);
  if(bucket.count>8)throw new TooManyRequestsException("Too many authentication attempts");
  return true;
 }
}
