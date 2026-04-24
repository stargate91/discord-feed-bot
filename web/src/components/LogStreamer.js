"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, Trash2, Maximize2, Minimize2 } from "lucide-react";

export default function LogStreamer() {
  const [logs, setLogs] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs?lines=100");
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    let interval;
    if (isLive) {
      interval = setInterval(fetchLogs, 3000); // Poll every 3s
    }
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const formatLog = (line) => {
    if (!line.trim()) return null;
    
    let color = "rgba(255,255,255,0.7)";
    if (line.includes("[ERROR]")) color = "#ff5555";
    if (line.includes("[WARNING]")) color = "#ffb86c";
    if (line.includes("[INFO]")) color = "#50fa7b";
    
    return (
      <div className="log-line" style={{ color }}>
        <span className="line-text">{line}</span>
      </div>
    );
  };

  return (
    <div className={`log-streamer-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="console-header">
        <div className="header-left">
          <Terminal size={14} className="terminal-icon" />
          <span className="console-title">System Log Streamer</span>
          {isLive && <div className="live-indicator">
            <div className="dot"></div>
            LIVE
          </div>}
        </div>
        <div className="header-actions">
          <button onClick={() => setIsLive(!isLive)} className={`action-btn ${isLive ? 'active' : ''}`} title="Toggle Live Sync">
            <RefreshCw size={14} className={isLive ? 'spin' : ''} />
          </button>
          <button onClick={clearLogs} className="action-btn" title="Clear Console">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="action-btn" title="Toggle Size">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className="console-body" ref={scrollRef}>
        {loading ? (
          <div className="loading-state">Initialing secure stream...</div>
        ) : (
          logs.map((line, i) => <div key={i}>{formatLog(line)}</div>)
        )}
      </div>

      <style jsx>{`
        .log-streamer-container {
          background: #0d0d12;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          height: 300px;
        }

        .log-streamer-container.expanded {
          height: 600px;
          border-color: rgba(123, 44, 191, 0.3);
        }

        .console-header {
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .terminal-icon { color: #bd93f9; }
        .console-title { font-size: 0.75rem; font-weight: 800; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px; }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 900;
          color: #50fa7b;
          background: rgba(80, 250, 123, 0.1);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .live-indicator .dot {
          width: 6px;
          height: 6px;
          background: #50fa7b;
          border-radius: 50%;
          animation: blink 1s infinite;
        }

        @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }

        .header-actions { display: flex; gap: 8px; }
        .action-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .action-btn:hover { background: rgba(255,255,255,0.05); color: white; }
        .action-btn.active { color: #50fa7b; }

        .spin { animation: rotate 2s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .console-body {
          flex: 1;
          padding: 15px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.8rem;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .console-body::-webkit-scrollbar { width: 6px; }
        .console-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .log-line {
          margin-bottom: 4px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .loading-state {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.3);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
