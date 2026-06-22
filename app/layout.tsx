import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323, Pixelify_Sans, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";
import { ColorSchemeController } from "@/components/theme/color-scheme-controller";
import { SplashScript } from "@/components/splash/splash-script";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { MusicController } from "@/components/music/music-controller";
import { UiClickSound } from "@/components/sound/ui-click-sound";
import { SplashScreen } from "@/components/splash/splash-screen";
import { getServerDictionary } from "@/lib/i18n/server";
import { EasterEggs } from "@/components/easter-eggs/easter-eggs";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
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

// A pixel face that stays in the GB/retro family but reads cleanly at body
// sizes — used for the long-form FAQ content (VT323 is too thin to read at
// length). See --font-readable in globals.css.
const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Accessibility "Font" setting (Settings → Font). These two faces back the
// "Monospaced" and "Sans-serif" options; the swap happens in CSS via the
// --font-ui-* intermediate vars (see globals.css), keyed on html[data-font].
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "700"],
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
  // Installed-to-home-screen behaviour on iOS: launch chromeless (standalone),
  // titled "Nomekop". The web app manifest (app/manifest.ts) covers Android /
  // desktop and its <link rel="manifest"> is injected automatically.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  // Next emits the modern `mobile-web-app-capable`; the legacy apple-prefixed
  // tag is what iOS < 16.4 reads to launch standalone, so include it too.
  other: { "apple-mobile-web-app-capable": "yes" },
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
    <html
      lang={locale}
      className={`${pressStart.variable} ${vt323.variable} ${pixelify.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
        <SplashScript />
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
            <UiClickSound />
            <ColorSchemeController />
            <SplashScreen disabled={splashDisabled} />
            <ServiceWorkerRegister />
          </AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
