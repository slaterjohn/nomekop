import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { MusicController } from "@/components/music/music-controller";
import { SplashScreen } from "@/components/splash/splash-screen";
import { getServerDictionary } from "@/lib/i18n/server";
import { EasterEggs } from "@/components/easter-eggs/easter-eggs";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

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

const DEFAULT_TITLE = "Nomekop — Pokemon TCG binder layout maker";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — Nomekop",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pokemon tcg binder",
    "binder layout",
    "master set",
    "reverse holo",
    "card collection tracker",
    "pokemon card checklist",
    "pokemon set list",
    "binder pages",
    "card prices",
    "pokemon tcg",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Applies to the root segment (home page); deeper routes set their own.
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#9bbc0f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getServerDictionary();
  // The boot splash is skipped in e2e (a full-screen overlay would block every
  // page's first interaction). Runtime env, read here on the server, so it works
  // against the prebuilt `next start` bundle without a rebuild.
  const splashDisabled = process.env.DISABLE_SPLASH === "1";
  return (
    <html lang={locale} className={`${pressStart.variable} ${vt323.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <LanguageProvider locale={locale} dict={dict}>
          <AnalyticsProvider>
            <a href="#main" className="skip-link uppercase">
              {dict.common.skipToContent}
            </a>
            <Header />
            {children}
            <SiteFooter />
            <EasterEggs />
            <MusicController />
            <SplashScreen disabled={splashDisabled} />
          </AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
