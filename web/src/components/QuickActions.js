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
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
        background: hovered ? 'rgba(123, 44, 191, 0.1)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${hovered ? 'rgba(123, 44, 191, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '12px', color: 'white', textDecoration: 'none',
        transition: 'all 0.25s ease',
        fontWeight: '600', fontSize: '0.95rem',
        transform: hovered ? 'translateX(8px)' : 'translateX(0)',
        boxShadow: hovered ? '0 5px 20px rgba(0, 0, 0, 0.25)' : 'none',
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
