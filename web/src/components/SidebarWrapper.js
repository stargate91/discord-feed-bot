"use client";

import { useSearchParams, usePathname } from "next/navigation";
import MainSidebar from "./MainSidebar";

export default function SidebarWrapper({ session, isMaster }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const guildId = searchParams.get("guild");

  // Hide sidebar if no guild is selected AND we are on the premium page
  // This allows the premium page to act as a landing page when opened from the public site or select-server
  if (!guildId && pathname === "/premium") {
    return null;
  }

  // If session doesn't exist, safety return (should be handled by layout but good to have)
  if (!session) return null;

  return <MainSidebar session={session} isMaster={isMaster} />;
}
