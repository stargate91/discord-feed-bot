import Sidebar from "@/components/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <div className={`app-container ${!session ? 'is-landing' : ''}`}>
      {session && <Sidebar />}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
