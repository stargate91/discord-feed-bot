"use client";

import Link from "next/link";
import { Plus, Shield, MessageSquare, Zap } from "lucide-react";
import { useState } from "react";

function QuickActionItem({ href, icon: Icon, label, description }) {
  return (
    <Link href={href} className="ui-quick-action-item">
      <div className="ui-quick-action-icon">
        <Icon size={18} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
        <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{label}</span>
        {description && (
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{description}</span>
        )}
      </div>
    </Link>
  );
}

export default function QuickActions({ guildId }) {
  return (
    <div className="ui-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 className="ui-form-label" style={{ margin: 0, opacity: 0.3 }}>Quick Actions</h3>
        <Zap size={14} style={{ color: 'var(--accent-color)', opacity: 0.4 }} />
      </div>

      <div className="ui-quick-action-list">
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
        <QuickActionItem
          href={`/monitors?guild=${guildId}&bulk=true`}
          icon={Zap}
          label="Bulk Wizard"
          description="Mass add feeds"
        />
      </div>
    </div>
  );
}
