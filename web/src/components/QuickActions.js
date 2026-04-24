"use client";

import Link from "next/link";
import { Plus, Shield, MessageSquare } from "lucide-react";
import { useState } from "react";

function QuickActionItem({ href, icon: Icon, label }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem',
        background: hovered ? 'rgba(123, 44, 191, 0.08)' : 'rgba(255, 255, 255, 0.01)',
        border: `1px solid ${hovered ? 'rgba(123, 44, 191, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: '16px', color: 'white', textDecoration: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        fontWeight: '700', fontSize: '0.9rem',
        transform: hovered ? 'translateX(10px) scale(1.02)' : 'translateX(0)',
        boxShadow: hovered ? '0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(123, 44, 191, 0.1)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Icon size={18} style={{
        color: hovered ? 'var(--accent-hover)' : 'var(--accent-color)',
        transition: 'color 0.25s ease'
      }} />
      <span style={{
        color: hovered ? 'var(--accent-hover)' : 'white',
        transition: 'color 0.25s ease'
      }}>{label}</span>
    </Link>
  );
}

export default function QuickActions({ guildId }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
      <h3 style={{
        fontSize: '0.8rem',
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        margin: 0,
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '0.5rem'
      }}>Quick Actions</h3>

      <QuickActionItem href={`/monitors?guild=${guildId}&add=true`} icon={Plus} label="Add New Feed" />
      <QuickActionItem href={`/settings?guild=${guildId}`} icon={Shield} label="Manage Roles" />
      <QuickActionItem href={`/settings?guild=${guildId}`} icon={MessageSquare} label="Alert Templates" />
    </div>
  );
}
