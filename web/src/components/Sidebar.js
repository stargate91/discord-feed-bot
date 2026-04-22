import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LogoutButton from "@/components/LogoutButton";
import GuildSwitcher from "@/components/GuildSwitcher";
import NavLinks from "@/components/NavLinks";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const isMaster = session?.user?.role === "master";

  return (
    <aside className="sidebar">
      {/* 1. Header with Guild Switcher */}
      <div className="sidebar-header">
        <GuildSwitcher isMaster={isMaster} />
      </div>
      
      {/* 2. Navigation Menu */}
      <nav className="sidebar-nav">
        <NavLinks session={session} isMaster={isMaster} />
      </nav>

      {/* 3. Footer with Logout and Brand */}
      <div className="sidebar-footer">
        <LogoutButton />
        
        <div className="bottom-brand">
          <Image
            src="/nova.jpg"
            alt="Nova"
            width={24}
            height={24}
            className="brand-logo-mini"
          />
          <div className="brand-text-mini">
            <span className="brand-name">NOVA</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
