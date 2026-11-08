import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export type BusinessType = "hotel" | "restaurant" | "service";
export interface AccessIdentity { id: string; email: string; role: "admin" | "partner"; status: string; }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
async function passwordHash(password: string): Promise<string> {
 const salt = randomBytes(16).toString("hex");
 const derived = await scrypt(password,salt,64) as Buffer;
 return "scrypt:"+salt+":"+derived.toString("hex");
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
 const parts = stored.split(":");
 if (parts.length!==3 || parts[0]!=="scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
 const actual = await scrypt(password,parts[1],64) as Buffer;
 return timingSafeEqual(actual,Buffer.from(parts[2],"hex"));
}
@Injectable()
export class AccessService {
 constructor(private readonly db: DataSource, private readonly config: ConfigService) {}
 async register(input: unknown) {
  const b = input as Record<string,unknown>;
  if (!b || typeof b!=="object" || Array.isArray(b)) throw new BadRequestException("Invalid registration");
  const email = typeof b.email==="string" ? b.email.trim().toLowerCase() : "";
  const password = b.password;
  const name = typeof b.name==="string" ? b.name.trim() : "";
  const slug = b.slug;
  const type = b.businessType;
  if (email.length>254 || !emailPattern.test(email) || typeof password!=="string" || password.length<12 || password.length>128 ||
      name.length<2 || name.length>160 || typeof slug!=="string" || slug.length>80 || !slugPattern.test(slug) ||
      !["hotel","restaurant","service"].includes(String(type))) throw new BadRequestException("Invalid registration fields");
  const digest = await passwordHash(password);
  try {
   return await this.db.transaction(async manager=>{
    const orgs:{id:string}[] = await manager.query(
      "INSERT INTO momap_organizations (slug,name,business_type) VALUES ($1,$2,$3) RETURNING id",[slug,name,type]);
    const users:{id:string}[] = await manager.query(
      "INSERT INTO momap_accounts (email,password_hash,platform_role,status) VALUES ($1,$2,'partner','pending') RETURNING id",[email,digest]);
    await manager.query("INSERT INTO momap_organization_memberships (organization_id,auth_subject,role) VALUES ($1,$2,'owner')",[orgs[0].id,users[0].id]);
    return {message:"Registration received; administrator approval required."};
   });
  } catch(e) {
   if (typeof e==="object" && e && "code" in e && e.code==="23505") throw new ConflictException("Email or business slug already registered");
   throw e;
  }
 }
 async login(input: unknown): Promise<{token:string; identity:AccessIdentity}> {
  const b=input as Record<string,unknown>;
  const email=typeof b?.email==="string" ? b.email.trim().toLowerCase() : "";
  const password=b?.password;
  if (!emailPattern.test(email) || typeof password!=="string" || password.length>128) throw new UnauthorizedException("Invalid credentials");
  const rows:{id:string;email:string;password_hash:string;platform_role:"admin"|"partner";status:string}[] =
    await this.db.query("SELECT id,email,password_hash,platform_role,status FROM momap_accounts WHERE lower(email)=lower($1)",[email]);
  const user=rows[0];
  if (!user || !(await verifyPassword(password,user.password_hash))) throw new UnauthorizedException("Invalid credentials");
  if (user.status!=="active") throw new ForbiddenException("Account pending approval or disabled");
  const token=randomBytes(32).toString("hex");
  await this.db.query("INSERT INTO momap_sessions (account_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '12 hours')",[user.id,hashToken(token)]);
  return {token,identity:{id:user.id,email:user.email,role:user.platform_role,status:user.status}};
 }
 async authenticate(token: string): Promise<AccessIdentity> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException("Authentication required");
  const rows:{id:string;email:string;role:"admin"|"partner";status:string}[] = await this.db.query(
   `SELECT a.id,a.email,a.platform_role AS role,a.status FROM momap_sessions s
      JOIN momap_accounts a ON a.id=s.account_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='active'`,[hashToken(token)]);
  if (!rows[0]) throw new UnauthorizedException("Session expired");
  return rows[0];
 }
 async logout(token:string) {
  if (/^[a-f0-9]{64}$/.test(token)) await this.db.query("DELETE FROM momap_sessions WHERE token_hash=$1",[hashToken(token)]);
  return {ok:true};
 }
 async myOrganizations(identity:AccessIdentity) {
  return this.db.query(
    `SELECT o.id,o.name,o.slug,o.business_type AS "businessType",m.role
       FROM momap_organizations o JOIN momap_organization_memberships m ON m.organization_id=o.id
       WHERE m.auth_subject=$1 ORDER BY o.name`,[identity.id]);
 }
 async myGuides(identity:AccessIdentity) {
  return this.db.query(
   `SELECT g.id,g.slug,g.title,g.published,o.name AS organization
      FROM momap_guides g JOIN momap_organization_memberships m ON m.organization_id=g.organization_id
      JOIN momap_organizations o ON o.id=g.organization_id
      WHERE m.auth_subject=$1 ORDER BY g.created_at DESC LIMIT 100`,[identity.id]);
 }
 async pending(identity:AccessIdentity) {
  if(identity.role!=="admin") throw new ForbiddenException();
  return this.db.query(
   `SELECT a.id,a.email,a.created_at AS "createdAt",o.name,o.business_type AS "businessType"
     FROM momap_accounts a LEFT JOIN momap_organization_memberships m ON m.auth_subject=a.id::text
     LEFT JOIN momap_organizations o ON o.id=m.organization_id
     WHERE a.status='pending' AND a.platform_role='partner' ORDER BY a.created_at LIMIT 100`);
 }
 async decide(identity:AccessIdentity,id:string,approve:boolean) {
  if(identity.role!=="admin") throw new ForbiddenException();
  if(!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException("Invalid account ID");
  const result:{id:string}[]=await this.db.query(
   "UPDATE momap_accounts SET status=$2 WHERE id=$1 AND status='pending' AND platform_role='partner' RETURNING id",
   [id,approve?"active":"disabled"]);
  if(!result[0]) throw new BadRequestException("Account not pending");
  return {ok:true};
 }
 /** One-time local bootstrap. Must never be callable from HTTP. */
 async bootstrapAdmin():Promise<void> {
  const email=this.config.get<string>("MOMAP_BOOTSTRAP_ADMIN_EMAIL");
  const password=this.config.get<string>("MOMAP_BOOTSTRAP_ADMIN_PASSWORD");
  if (!email || !password) return;
  if (!emailPattern.test(email) || password.length<16 || password.length>128) throw new Error("Invalid admin bootstrap credentials");
  const existing:{id:string}[]=await this.db.query("SELECT id FROM momap_accounts WHERE platform_role='admin' LIMIT 1");
  if(existing.length) return;
  const digest=await passwordHash(password);
  await this.db.query(
   "INSERT INTO momap_accounts(email,password_hash,platform_role,status) VALUES ($1,$2,'admin','active') ON CONFLICT DO NOTHING",
   [email.trim().toLowerCase(),digest]);
 }
}
