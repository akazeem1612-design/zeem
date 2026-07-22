const clean=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
export async function POST(request:Request){
  try{ const p=await request.json() as Record<string,unknown>; if(clean(p.companyFax)) return Response.json({ok:true});
    const businessName=clean(p.businessName,120),firstName=clean(p.firstName,80),email=clean(p.email,180),industry=clean(p.industry,60);
    if(!businessName||!firstName||!email.includes("@")||!industry) return Response.json({error:"Please complete the required fields."},{status:400});
    // @ts-ignore -- cloudflare:workers module provided dynamically at runtime in Cloudflare environment
    const workerModule = await import(/* webpackIgnore: true */ "cloudflare:workers").catch(() => null);
    const env = workerModule?.env || (process.env as any);
    if(env?.DB){
      await env.DB.prepare("INSERT INTO leads (business_name, first_name, email, phone, website, industry, challenge, source_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)")
        .bind(businessName,firstName,email,clean(p.phone,40)||null,clean(p.website,250)||null,industry,clean(p.challenge,1000)||null,clean(p.sourcePath,180)||null,Math.floor(Date.now()/1000)).run();
    } else {
      console.log("[Lead intake]", { businessName, firstName, email, industry });
    }
    return Response.json({ok:true},{status:201});
  }catch(error){ console.error("Lead intake failed",error); return Response.json({error:"Unable to save request."},{status:500}); }
}

