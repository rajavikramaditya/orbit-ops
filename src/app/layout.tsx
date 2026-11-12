import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Orbit Ops — Orbit Media by Orbitcore",
  description: "Internal operations for Orbit Media. What must we do today?",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Orbit Ops" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ToastProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav />
            <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 md:px-8 md:py-8 pb-28 md:pb-10">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
