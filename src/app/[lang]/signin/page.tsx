import { notFound } from "next/navigation";

import { SignInScreen } from "@/components/auth/sign-in-screen";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/signin">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.auth.title };
}

export default async function SignInPage({ params }: PageProps<"/[lang]/signin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <SignInScreen />;
}
