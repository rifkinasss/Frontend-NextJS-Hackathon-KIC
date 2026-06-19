import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { sidebarInitScript } from "@/lib/sidebar/sidebar-script";
import { themeInitScript } from "@/lib/theme/theme-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIMOSI",
  description: "Sistem Monitoring Emisi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarInitScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <LanguageProvider>
            <SidebarProvider>
              <div className="flex">
                <Sidebar />
                <div className="ml-[var(--sidebar-width)] flex min-h-screen flex-1 flex-col transition-[margin-left] duration-300 ease-out">
                  <AppHeader />
                  <main className="p-8 pb-12">{children}</main>
                </div>
              </div>
            </SidebarProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

