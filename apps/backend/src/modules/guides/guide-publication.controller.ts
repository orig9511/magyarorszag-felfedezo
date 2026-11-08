import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AccessGuard, AuthenticatedRequest } from "../access/access.guard";
import { GuidePublicationService } from "./guide-publication.service";
@Controller("api/access/admin/guides")
@UseGuards(AccessGuard)
export class GuidePublicationController {
 constructor(private readonly publication:GuidePublicationService){}
 @Get() list(@Req() req:AuthenticatedRequest){return this.publication.list(req.identity!);}
 @Post(":id/publish") publish(@Req() req:AuthenticatedRequest,@Param("id") id:string){
  return this.publication.decide(req.identity!,id,true);
 }
 @Post(":id/unpublish") unpublish(@Req() req:AuthenticatedRequest,@Param("id") id:string){
  return this.publication.decide(req.identity!,id,false);
 }
}
