"use client";

import { Rocket, Settings, Plus, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function EmptyStateCard({ guildId }) {
  return (
    <div className="empty-state-card">
      {/* Background decorative elements */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <div className="card-inner">
        <div className="glow-icon">
          <Rocket size={32} />
          <div className="icon-pulse"></div>
        </div>

        <div className="content">
          <div className="badge">First Steps</div>
          <h2>Welcome aboard!</h2>
          <p>
            The server is still quiet... Let's bring it to life! Follow these two quick steps
            to get the first news delivered to your Discord channel.
          </p>

          <div className="steps-container">
            <Link href={`/settings?guild=${guildId}`} className="step-card">
              <div className="step-num">01</div>
              <div className="step-body">
                <h3>Settings <Settings size={14} /></h3>
                <p>Configure language and default colors.</p>
              </div>
              <div className="step-action">
                <ArrowRight size={18} />
              </div>
            </Link>

            <Link href={`/monitors?guild=${guildId}`} className="step-card primary">
              <div className="step-num">02</div>
              <div className="step-body">
                <h3>Add Monitor <Plus size={14} /></h3>
                <p>Pick a platform and start monitoring.</p>
              </div>
              <div className="step-action">
                <ArrowRight size={18} />
              </div>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .empty-state-card {
          position: relative;
          background: rgba(15, 15, 20, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(123, 44, 191, 0.3);
          border-radius: 32px;
          padding: 3rem;
          overflow: hidden;
          margin-bottom: 2.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), inset 0 0 80px rgba(123, 44, 191, 0.05);
        }

        .bg-blob {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.15;
          animation: drift 15s infinite alternate;
        }

        .blob-1 {
          background: #9d4edd;
          top: -50px;
          right: -50px;
        }

        .blob-2 {
          background: #3c096c;
          bottom: -50px;
          left: -50px;
          animation-delay: -7s;
        }

        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(-30px, 40px) scale(1.2); }
        }

        .card-inner {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 2.5rem;
          align-items: flex-start;
        }

        .glow-icon {
          position: relative;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 15px 30px rgba(123, 44, 191, 0.4);
          flex-shrink: 0;
        }

        .icon-pulse {
          position: absolute;
          inset: -10px;
          border: 2px solid #9d4edd;
          border-radius: 28px;
          opacity: 0;
          animation: pulse-out 2s infinite;
        }

        @keyframes pulse-out {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(157, 78, 221, 0.15);
          color: #c77dff;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 1rem;
          border: 1px solid rgba(157, 78, 221, 0.2);
        }

        .content h2 {
          font-size: 2.2rem;
          font-weight: 900;
          margin: 0 0 1rem 0;
          color: white;
          background: linear-gradient(to right, #fff, #c77dff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .content p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.1rem;
          line-height: 1.7;
          margin-bottom: 2.5rem;
          max-width: 550px;
        }

        .steps-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .step-card {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #ffffff !important;
          outline: none;
        }

        .step-card:visited, .step-card:active, .step-card:focus {
          color: #ffffff !important;
          text-decoration: none;
        }

        .step-card:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }

        .step-card.primary {
          background: rgba(157, 78, 221, 0.1);
          border-color: rgba(157, 78, 221, 0.3);
        }

        .step-card.primary:hover {
          background: rgba(157, 78, 221, 0.15);
          border-color: rgba(157, 78, 221, 0.5);
        }

        .step-num {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          opacity: 0.2;
          font-family: monospace;
        }

        .step-body h3 {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffffff !important;
        }

        .step-body p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0;
        }

        .step-action {
          margin-left: auto;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          transition: all 0.3s;
        }

        .step-card:hover .step-action {
          background: #9d4edd;
          color: white;
          transform: scale(1.1);
        }

        @media (max-width: 1100px) {
          .steps-container { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .card-inner { flex-direction: column; gap: 1.5rem; }
          .empty-state-card { padding: 2rem; }
          .content h2 { font-size: 1.6rem; }
        }
      `}</style>
    </div>
  );
}
