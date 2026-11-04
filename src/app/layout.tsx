import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { RoleProvider } from "@/lib/role";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Orbit Ops — Orbit Media by Orbitcore",
  description: "Internal operations for Orbit Media. What must we do today?",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RoleProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav />
            <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6">{children}</main>
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}
