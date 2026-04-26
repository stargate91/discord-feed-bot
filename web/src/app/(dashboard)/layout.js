import { Suspense } from "react";
import SidebarWrapper from "@/components/SidebarWrapper";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import FloatingHelp from "@/components/FloatingHelp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  const isMaster = session?.user?.role === "master";

  return (
    <div className={`app-container ${!session ? 'is-landing' : ''}`}>
      {session && (
        <Suspense fallback={<aside className="sidebar"></aside>}>
          <SidebarWrapper session={session} isMaster={isMaster} />
        </Suspense>
      )}
      <main className="main-content app-grid-bg" style={{ padding: '2rem' }}>
        <AnnouncementBanner />
        {children}
      </main>
      <Suspense fallback={null}>
        <FloatingHelp />
      </Suspense>
    </div>
  );
}
