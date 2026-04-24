import { Suspense } from "react";
import SidebarWrapper from "@/components/SidebarWrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
      <main className="main-content app-grid-bg">
        {children}
      </main>
    </div>
  );
}
