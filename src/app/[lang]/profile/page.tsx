import { notFound } from "next/navigation";

import { ProfileView } from "@/components/profile/profile-view";
import { isLocale } from "@/i18n/config";

export default async function ProfilePage({ params }: PageProps<"/[lang]/profile"> ) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ProfileView />;
}
