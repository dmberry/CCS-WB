import type { Metadata } from "next";
import { Libre_Baskerville, Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";
import { AISettingsProvider } from "@/context/AISettingsContext";

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
  title: "CCS-lab",
  description:
    "Critical Code Studies Laboratory: Close reading and hermeneutic analysis of software as cultural artefact",
  keywords: [
    "critical code studies",
    "code hermeneutics",
    "software analysis",
    "code archaeology",
    "digital humanities",
    "code critique",
  ],
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
    >
      <body className="font-body antialiased bg-ivory text-ink selection:bg-burgundy/20 selection:text-burgundy-900">
        <AISettingsProvider>
          <SessionProvider>{children}</SessionProvider>
        </AISettingsProvider>
      </body>
    </html>
  );
}
