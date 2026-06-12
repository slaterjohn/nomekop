import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bindermon — Pokemon binder layout maker",
  description:
    "Pick a Pokemon TCG set, choose your binder grid, interleave reverse holos, and print beautiful A4 binder pages, checklists and placeholders.",
};

export const viewport: Viewport = {
  themeColor: "#9bbc0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">
          SKIP TO CONTENT
        </a>
        {children}
      </body>
    </html>
  );
}
