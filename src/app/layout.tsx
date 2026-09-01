import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { commonMessages } from "@/messages/common";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";

const displayFont = Manrope({ variable: "--font-app-display", subsets: ["latin"] });
const sansFont = DM_Sans({ variable: "--font-app-sans", subsets: ["latin"] });
const monoFont = JetBrains_Mono({ variable: "--font-app-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: commonMessages.metadata.title,
  description: commonMessages.metadata.description,
  robots: { follow: false, index: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`} lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
