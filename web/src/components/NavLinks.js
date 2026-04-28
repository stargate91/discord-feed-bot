"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Crown, Monitor, BarChart2, Settings, HelpCircle, Code } from "lucide-react";

export default function NavLinks({ session, isMaster }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  const guildId = searchParams.get("guild");

  // Helper to build the link while preserving the current guild
  const getHref = (path) => {
    if (!guildId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}guild=${guildId}`;
  };

  const isActive = (path) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/" && path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  // Prevent hydration mismatch by rendering a consistent skeleton structure
  if (!mounted) {
    return (
      <ul className="nav-links">
        <li><div className="nav-link skeleton"><LayoutDashboard size={20} className="nav-icon" /><span className="link-text">Dashboard</span></div></li>
        <li><div className="nav-link premium-link skeleton"><Crown size={20} className="nav-icon" /><span className="link-text">Premium</span></div></li>
        <li><div className="nav-link skeleton"><Monitor size={20} className="nav-icon" /><span className="link-text">Monitors</span></div></li>
        <li><div className="nav-link skeleton"><BarChart2 size={20} className="nav-icon" /><span className="link-text">Analytics</span></div></li>
        <li><div className="nav-link skeleton"><Settings size={20} className="nav-icon" /><span className="link-text">Settings</span></div></li>
        <li><div className="nav-link skeleton"><HelpCircle size={20} className="nav-icon" /><span className="link-text">FAQ</span></div></li>
      </ul>
    );
  }

  return (
    <ul className="nav-links">
      <li>
        <Link
          href={getHref("/dashboard")}
          className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
          title="Dashboard"
        >
          <LayoutDashboard size={20} className="nav-icon" />
          <span className="link-text">Dashboard</span>
        </Link>
      </li>

      <li>
        <Link
          href={getHref("/premium")}
          className={`nav-link premium-link ${isActive("/premium") ? "active" : ""}`}
          title="Premium"
        >
          <Crown size={20} className="nav-icon" />
          <span className="link-text">Premium</span>
        </Link>
      </li>

      {session ? (
        <>
          <li>
            <Link
              href={getHref("/monitors")}
              className={`nav-link ${isActive("/monitors") ? "active" : ""}`}
              title="Monitors"
            >
              <Monitor size={20} className="nav-icon" />
              <span className="link-text">Monitors</span>
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/analytics")}
              className={`nav-link ${isActive("/analytics") ? "active" : ""}`}
              title="Analytics"
            >
              <BarChart2 size={20} className="nav-icon" />
              <span className="link-text">Analytics</span>
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/settings")}
              className={`nav-link ${isActive("/settings") ? "active" : ""}`}
              title="Settings"
            >
              <Settings size={20} className="nav-icon" />
              <span className="link-text">Settings</span>
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/faq")}
              className={`nav-link ${isActive("/faq") ? "active" : ""}`}
              title="FAQ"
            >
              <HelpCircle size={20} className="nav-icon" />
              <span className="link-text">FAQ</span>
            </Link>
          </li>

          {isMaster && (
            <li>
              <Link
                href={getHref("/dev")}
                className={`nav-link dev-link ${isActive("/dev") ? "active" : ""}`}
                title="Dev Settings"
              >
                <Code size={20} className="nav-icon" />
                <span className="link-text">Dev Settings</span>
              </Link>
            </li>
          )}
        </>
      ) : (
        <li className="nav-info">Log in to see more.</li>
      )}
    </ul>
  );
}

