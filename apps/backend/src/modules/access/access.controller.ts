import { Body, Controller, Get, Post, Param, Req, UseGuards, ForbiddenException, Headers } from "@nestjs/common";
import { AccessGuard, AuthenticatedRequest } from "./access.guard";
import { AccessService } from "./access.service";
import { AccessThrottleGuard } from "./access-throttle.guard";
@Controller("api/access")
export class AccessController {
 constructor(private readonly access:AccessService) {}
 @Post("register") @UseGuards(AccessThrottleGuard) register(@Body() body:unknown) {return this.access.register(body);}
 @Post("login") @UseGuards(AccessThrottleGuard) login(@Body() body:unknown) {return this.access.login(body);}
 @Post("logout") @UseGuards(AccessGuard)
 logout(@Headers("authorization") header:string) {return this.access.logout(header.slice(7));}
 @Get("me") @UseGuards(AccessGuard)
 me(@Req() req:AuthenticatedRequest) {return req.identity;}
 @Get("organizations") @UseGuards(AccessGuard)
 organizations(@Req() req:AuthenticatedRequest) {return this.access.myOrganizations(req.identity!);}
 @Get("guides") @UseGuards(AccessGuard)
 guides(@Req() req:AuthenticatedRequest) {return this.access.myGuides(req.identity!);}
 @Get("admin/pending") @UseGuards(AccessGuard)
 pending(@Req() req:AuthenticatedRequest) {return this.access.pending(req.identity!);}
 @Post("admin/:id/approve") @UseGuards(AccessGuard)
 approve(@Req() req:AuthenticatedRequest,@Param("id") id:string) {return this.access.decide(req.identity!,id,true);}
 @Post("admin/:id/reject") @UseGuards(AccessGuard)
 reject(@Req() req:AuthenticatedRequest,@Param("id") id:string) {return this.access.decide(req.identity!,id,false);}
}
