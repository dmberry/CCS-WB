import type { Metadata } from "next";
import { Libre_Baskerville, Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";
import { AISettingsProvider } from "@/context/AISettingsContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { LoginModal } from "@/components/auth/LoginModal";
import { ProjectsModal } from "@/components/projects/ProjectsModal";
import { MembersModal } from "@/components/projects/MembersModal";
import { ProjectSyncBanner } from "@/components/projects/ProjectSyncBanner";
import { Clippy } from "@/components/easter-eggs/Clippy";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Critical Code Studies Workbench",
  description:
    "Annotation and digital methods for the hermeneutic analysis of code. Available as a web app or desktop application.",
  keywords: [
    "critical code studies",
    "code hermeneutics",
    "software analysis",
    "code archaeology",
    "digital humanities",
    "code annotation",
  ],
  openGraph: {
    title: "Critical Code Studies Workbench",
    description:
      "Annotation and digital methods for the hermeneutic analysis of code. Available as a web app or desktop application.",
    type: "website",
    siteName: "CCS Workbench",
  },
  twitter: {
    card: "summary",
    title: "Critical Code Studies Workbench",
    description:
      "Annotation and digital methods for the hermeneutic analysis of code.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${libreBaskerville.variable} ${sourceSerif.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline script to prevent dark mode flash - runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('ccs-wb-settings');
                  if (stored) {
                    var parsed = JSON.parse(stored);
                    var theme = parsed.settings && parsed.settings.theme;
                    var isDark = theme === 'dark' ||
                      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-ivory text-ink selection:bg-burgundy/20 selection:text-burgundy-900">
        <AppSettingsProvider>
          <AISettingsProvider>
            <AuthProvider>
              <SessionProvider>
                <ProjectsProvider>
                  {children}
                  <ProjectsModal />
                  <MembersModal />
                  <ProjectSyncBanner />
                  <Clippy />
                </ProjectsProvider>
              </SessionProvider>
              <LoginModal />
            </AuthProvider>
          </AISettingsProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
