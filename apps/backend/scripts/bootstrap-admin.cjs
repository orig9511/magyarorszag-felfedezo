/**
 * Explicit one-time admin bootstrap: run only in a trusted environment.
 * Requires DATABASE_URL, MOMAP_BOOTSTRAP_ADMIN_EMAIL and MOMAP_BOOTSTRAP_ADMIN_PASSWORD.
 * SQL proposal 004 must already be reviewed and applied.
 */
const {Client}=require('pg');
const {randomBytes,scrypt:callback}=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(callback);
(async()=>{
 const email=(process.env.MOMAP_BOOTSTRAP_ADMIN_EMAIL||'').trim().toLowerCase();
 const password=process.env.MOMAP_BOOTSTRAP_ADMIN_PASSWORD||'';
 if(!process.env.DATABASE_URL||!/^\S+@\S+\.\S+$/.test(email)||password.length<16||password.length>128){
  throw Error('Missing/invalid DATABASE_URL, MOMAP_BOOTSTRAP_ADMIN_EMAIL or MOMAP_BOOTSTRAP_ADMIN_PASSWORD (min 16 chars)');
 }
 const client=new Client({connectionString:process.env.DATABASE_URL});
 await client.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(729401)');
  const existing=await client.query("SELECT id FROM momap_accounts WHERE platform_role='admin' LIMIT 1");
  if(existing.rows.length){console.log('An admin account already exists. No changes made.');await client.query('ROLLBACK');return;}
  const salt=randomBytes(16).toString('hex');
  const hash=(await scrypt(password,salt,64)).toString('hex');
  const result=await client.query(
   "INSERT INTO momap_accounts (email,password_hash,platform_role,status) VALUES ($1,$2,'admin','active') RETURNING id",
   [email,'scrypt:'+salt+':'+hash]);
  await client.query('COMMIT');
  console.log('Admin account created:',result.rows[0].id);
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{await client.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
