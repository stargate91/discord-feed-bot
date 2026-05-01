"use client";

import { Rocket, Settings, Plus, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function EmptyStateCard({ guildId }) {
  return (
    <div className="ui-empty-state-card">
      {/* Background decorative elements */}
      <div className="bg-blob blob-1" style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0, opacity: 0.15, background: '#9d4edd', top: '-50px', right: '-50px' }}></div>
      <div className="bg-blob blob-2" style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0, opacity: 0.15, background: '#3c096c', bottom: '-50px', left: '-50px' }}></div>

      <div className="card-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
        <div className="glow-icon" style={{ position: 'relative', width: '80px', height: '80px', background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 15px 30px rgba(123, 44, 191, 0.4)', flexShrink: 0 }}>
           <Rocket size={32} />
        </div>

        <div className="content">
          <div className="ui-badge-neon" style={{ marginBottom: '1.5rem' }}>First Steps</div>
          <h2 className="ui-title-section" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome aboard!</h2>
          <p className="ui-text-lead" style={{ maxWidth: '550px', marginBottom: '2.5rem' }}>
            The server is still quiet... Let's bring it to life! Follow these two quick steps
            to get the first news delivered to your Discord channel.
          </p>

          <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <Link href={`/settings?guild=${guildId}`} className="ui-step-card">
              <div className="ui-step-num">01</div>
              <div className="ui-step-body">
                <h3>Settings <Settings size={14} /></h3>
                <p>Configure language and default colors.</p>
              </div>
              <div style={{ marginLeft: 'auto', width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <ArrowRight size={18} />
              </div>
            </Link>

            <Link href={`/monitors?guild=${guildId}`} className="ui-step-card ui-primary">
              <div className="ui-step-num">02</div>
              <div className="ui-step-body">
                <h3>Add Monitor <Plus size={14} /></h3>
                <p>Pick a platform and start monitoring.</p>
              </div>
              <div style={{ marginLeft: 'auto', width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <ArrowRight size={18} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
