import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://zeemservices.com"),
  title: { default: "Zeem Services | Every Lead Answered", template: "%s | Zeem Services" },
  description: "Managed 24/7 lead response, qualification, follow-up and appointment booking for service businesses.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Zeem Services", description: "Turn missed inquiries into qualified, booked opportunities—24/7.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
