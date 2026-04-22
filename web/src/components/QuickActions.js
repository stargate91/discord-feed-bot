"use client";

import Link from "next/link";
import { Plus, Shield, MessageSquare } from "lucide-react";

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

      <Link href={`/monitors?guild=${guildId}&add=true`} className="quick-action-link" style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px', color: 'white', textDecoration: 'none', transition: 'all 0.2s',
        fontWeight: '600', fontSize: '0.95rem'
      }}>
        <Plus size={18} style={{ color: 'var(--accent-color)' }} />
        <span>Add New Feed</span>
      </Link>

      <Link href={`/settings?guild=${guildId}`} className="quick-action-link" style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px', color: 'white', textDecoration: 'none', transition: 'all 0.2s',
        fontWeight: '600', fontSize: '0.95rem'
      }}>
        <Shield size={18} style={{ color: 'var(--accent-color)' }} />
        <span>Manage Roles</span>
      </Link>

      <Link href={`/settings?guild=${guildId}`} className="quick-action-link" style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px', color: 'white', textDecoration: 'none', transition: 'all 0.2s',
        fontWeight: '600', fontSize: '0.95rem'
      }}>
        <MessageSquare size={18} style={{ color: 'var(--accent-color)' }} />
        <span>Alert Templates</span>
      </Link>

      <style jsx>{`
        .quick-action-link {
          transition: all 0.2s ease;
        }
        .quick-action-link:hover {
          background: rgba(123, 44, 191, 0.08) !important;
          border-color: rgba(123, 44, 191, 0.3) !important;
          transform: translateX(8px);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }
        .quick-action-link:hover span {
           color: var(--accent-color);
        }
      `}</style>
    </div>
  );
}
