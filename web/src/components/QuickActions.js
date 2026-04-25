"use client";

import Link from "next/link";
import { Plus, Shield, MessageSquare, Zap } from "lucide-react";
import { useState } from "react";

function QuickActionItem({ href, icon: Icon, label, description }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.8rem 1rem',
        background: hovered ? 'rgba(123, 44, 191, 0.12)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hovered ? 'rgba(123, 44, 191, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: '14px',
        color: 'white',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateX(5px)' : 'translateX(0)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: hovered ? 'var(--accent-color)' : 'rgba(123, 44, 191, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        boxShadow: hovered ? '0 0 12px var(--accent-glow)' : 'none'
      }}>
        <Icon size={18} style={{
          color: hovered ? 'white' : 'var(--accent-color)',
          transition: 'all 0.3s ease'
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
        <span style={{
          color: hovered ? 'white' : 'rgba(255,255,255,0.9)',
          fontWeight: '700',
          fontSize: '0.85rem'
        }}>{label}</span>
        {description && (
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{description}</span>
        )}
      </div>
    </Link>
  );
}

export default function QuickActions({ guildId }) {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: 'fit-content',
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{
          fontSize: '0.75rem',
          fontWeight: '900',
          color: 'rgba(255, 255, 255, 0.3)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          margin: 0
        }}>Quick Actions</h3>
        <Zap size={14} color="rgba(123, 44, 191, 0.4)" />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <QuickActionItem
          href={`/monitors?guild=${guildId}&add=true`}
          icon={Plus}
          label="Add Feed"
          description="Create a new monitor"
        />
        <QuickActionItem
          href={`/settings?guild=${guildId}`}
          icon={Shield}
          label="Permissions"
          description="Configure admin roles"
        />
        <QuickActionItem
          href={`/settings?guild=${guildId}`}
          icon={MessageSquare}
          label="Templates"
          description="Custom alert messages"
        />
      </div>
    </div>
  );
}
