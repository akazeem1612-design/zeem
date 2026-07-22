import Link from "next/link";
import { industries } from "../lib/industries";
import { Logo } from "./site-header";
export function Footer(){ return <footer><div className="shell footer-grid"><div><Logo/><p>Every lead answered. Every opportunity followed up.</p></div><div><b>Industries</b>{industries.map(i=><Link key={i.slug} href={`/industries/${i.slug}`}>{i.label}</Link>)}</div><div><b>Company</b><Link href="/#how-it-works">How it works</Link><Link href="/#pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Zeem Services</span><span>Response. Qualify. Book. Follow up.</span></div></footer>; }
