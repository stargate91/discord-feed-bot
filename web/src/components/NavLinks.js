"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

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
        <li><div className="nav-link skeleton">Dashboard</div></li>
        <li><div className="nav-link premium-link skeleton">Premium</div></li>
        <li><div className="nav-link skeleton">Monitors</div></li>
        <li><div className="nav-link skeleton">Analytics</div></li>
        <li><div className="nav-link skeleton">Settings</div></li>
        <li><div className="nav-link skeleton">FAQ</div></li>
      </ul>
    );
  }

  return (
    <ul className="nav-links">
      <li>
        <Link
          href={getHref("/dashboard")}
          className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
        >
          Dashboard
        </Link>
      </li>

      <li>
        <Link
          href={getHref("/premium")}
          className={`nav-link premium-link ${isActive("/premium") ? "active" : ""}`}
        >
          <span>Premium</span>
        </Link>
      </li>

      {session ? (
        <>
          <li>
            <Link
              href={getHref("/monitors")}
              className={`nav-link ${isActive("/monitors") ? "active" : ""}`}
            >
              Monitors
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/analytics")}
              className={`nav-link ${isActive("/analytics") ? "active" : ""}`}
            >
              Analytics
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/settings")}
              className={`nav-link ${isActive("/settings") ? "active" : ""}`}
            >
              Settings
            </Link>
          </li>
          <li>
            <Link
              href={getHref("/faq")}
              className={`nav-link ${isActive("/faq") ? "active" : ""}`}
            >
              FAQ
            </Link>
          </li>

          {isMaster && (
            <li>
              <Link
                href={getHref("/dev")}
                className={`nav-link dev-link ${isActive("/dev") ? "active" : ""}`}
              >
                Dev Settings
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
