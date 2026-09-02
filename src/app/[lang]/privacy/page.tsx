import { notFound } from "next/navigation";

import { LegalPage } from "@/components/legal-page";
import { legal } from "@/content/legal";
import { isLocale, locales } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: legal[lang].privacy.title };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LegalPage document={legal[lang].privacy} lang={lang} />;
}
