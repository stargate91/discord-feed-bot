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
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '0.75rem', 
        padding: '1.5rem 1rem',
        background: hovered ? 'rgba(123, 44, 191, 0.12)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hovered ? 'rgba(123, 44, 191, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: '20px', 
        color: 'white', 
        textDecoration: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center',
        transform: hovered ? 'translateY(-5px) scale(1.02)' : 'translateY(0)',
        boxShadow: hovered ? '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 20px rgba(123, 44, 191, 0.2)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: hovered ? 'var(--accent-color)' : 'rgba(123, 44, 191, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        marginBottom: '4px',
        boxShadow: hovered ? '0 0 15px var(--accent-glow)' : 'none'
      }}>
        <Icon size={22} style={{
          color: hovered ? 'white' : 'var(--accent-color)',
          transition: 'all 0.3s ease'
        }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{
          color: hovered ? 'white' : 'rgba(255,255,255,0.9)',
          fontWeight: '800',
          fontSize: '0.85rem',
          letterSpacing: '0.5px'
        }}>{label}</span>
        {description && (
           <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{description}</span>
        )}
      </div>

      {/* Decorative background element */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-20%',
        width: '60px',
        height: '60px',
        background: 'var(--accent-color)',
        filter: 'blur(30px)',
        opacity: hovered ? 0.2 : 0,
        transition: 'opacity 0.4s ease'
      }}></div>
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
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px' 
      }}>
        <QuickActionItem 
          href={`/monitors?guild=${guildId}&add=true`} 
          icon={Plus} 
          label="Add Feed" 
          description="New monitor"
        />
        <QuickActionItem 
          href={`/settings?guild=${guildId}`} 
          icon={Shield} 
          label="Permissions" 
          description="Admin roles"
        />
        <QuickActionItem 
          href={`/settings?guild=${guildId}`} 
          icon={MessageSquare} 
          label="Templates" 
          description="Custom alert"
        />
      </div>
    </div>
  );
}
