import type { Metadata } from "next";
import { Comfortaa, Nunito } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";

import "../globals.css";

import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { CatalogueProvider } from "@/data/catalogue-provider";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { getCatalogue } from "@/lib/catalogue";
import { googleSiteVerification, siteUrl } from "@/lib/site";

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

/**
 * Pages are prerendered but refreshed every five minutes, so a picture added to
 * the database shows up on its own — no rebuild, no deploy.
 */
export const revalidate = 300;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  // The picture a shared link shows comes from the catalogue rather than a
  // hard-coded file, so it cannot point at something that no longer exists.
  const { puzzles } = await getCatalogue();
  const cover = puzzles.find((puzzle) => puzzle.access === "free") ?? puzzles[0];

  return {
    // Absolute URLs are built from here, so social previews and canonical tags
    // point at the real site rather than at whichever deployment rendered them.
    metadataBase: new URL(siteUrl),
    title: {
      default: dict.common.appName,
      template: `%s · ${dict.common.appName}`,
    },
    description: dict.seo.site,
    applicationName: dict.common.appName,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((item) => [item, `/${item}`])),
    },
    openGraph: {
      type: "website",
      siteName: dict.common.appName,
      title: dict.home.heroTitle,
      description: dict.seo.site,
      url: `/${locale}`,
      locale: locale === "uk" ? "uk_UA" : "en_US",
      images: cover
        ? [{ url: cover.image, width: cover.width, height: cover.height, alt: dict.common.appName }]
        : undefined,
    },
    twitter: { card: "summary_large_image" },
    verification: { google: googleSiteVerification },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const { categories, puzzles } = await getCatalogue();

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
          <CatalogueProvider categories={categories} puzzles={puzzles}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <div className="pb-28 md:pb-0" />
            <BottomNav />
          </CatalogueProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
