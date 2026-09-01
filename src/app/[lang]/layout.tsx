import type { Metadata } from "next";
import { Comfortaa, Nunito } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";

import "../globals.css";

import { BottomNav } from "@/components/site/bottom-nav";
import { SiteHeader } from "@/components/site/header";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";

const display = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

/** Applies the saved theme before first paint so there is no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("puzzlies.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(isLocale(lang) ? lang : "uk");
  return {
    title: dict.common.appName,
    description: dict.common.tagline,
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#fff8f0" />
      </head>
      <body className="flex min-h-full flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <I18nProvider dict={dict} locale={lang}>
          <SiteHeader />
          <main className="flex-1 pb-28 md:pb-12">{children}</main>
          <BottomNav />
        </I18nProvider>
      </body>
    </html>
  );
}
