import type { Metadata } from "next";
import localFont from "next/font/local";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const mostWave = localFont({
  src: "../public/fonts/most-wave.otf",
  variable: "--font-display",
  display: "swap",
});

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-game",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fjodor's Defense",
  description: "Defend Södermalm from invaders - a tower defense game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mostWave.variable} ${pixelifySans.variable} h-full`}>
      <body className="h-full overflow-hidden m-0 p-0">{children}</body>
    </html>
  );
}
