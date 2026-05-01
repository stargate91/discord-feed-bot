"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, Trash2, Maximize2, Minimize2 } from "lucide-react";

export default function LogStreamer() {
  const [logs, setLogs] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs?lines=100");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized - Master access required");
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setError(null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setError(error.message);
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
    if (scrollRef.current && !error) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, error]);

  const clearLogs = () => {
    setLogs([]);
    setError(null);
  };

  const formatLog = (line) => {
    if (!line || !line.trim()) return null;
    
    let className = "";
    if (line.includes("[ERROR]")) className = "ui-log-error";
    else if (line.includes("[WARNING]")) className = "ui-log-warning";
    else if (line.includes("[INFO]")) className = "ui-log-info";
    
    return (
      <div className={`log-line ${className}`} style={{ marginBottom: '4px', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        <span className="line-text">{line}</span>
      </div>
    );
  };

  return (
    <div className="ui-terminal" style={{ height: isExpanded ? '600px' : '300px' }}>
      <div className="ui-terminal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Terminal size={14} style={{ color: '#bd93f9' }} />
          <span className="ui-form-label" style={{ margin: 0, opacity: 0.6 }}>System Log Streamer</span>
          {isLive && !error && (
            <div className="ui-terminal-status ui-terminal-status-live">
              <div className="ui-dot"></div>
              LIVE
            </div>
          )}
          {error && (
            <div className="ui-terminal-status" style={{ background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555' }}>
              OFFLINE
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsLive(!isLive)} className="ui-btn" style={{ padding: '6px', background: 'transparent', color: isLive ? '#50fa7b' : 'rgba(255,255,255,0.3)' }}>
            <RefreshCw size={14} className={isLive && !error ? 'ui-spin' : ''} />
          </button>
          <button onClick={clearLogs} className="ui-btn" style={{ padding: '6px', background: 'transparent', color: 'rgba(255,255,255,0.3)' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="ui-btn" style={{ padding: '6px', background: 'transparent', color: 'rgba(255,255,255,0.3)' }}>
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className="ui-terminal-body" ref={scrollRef}>
        {loading ? (
          <div className="ui-terminal-loading" style={{ color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic' }}>Initializing secure stream...</div>
        ) : error ? (
          <div className="ui-terminal-error">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'rgba(255, 85, 85, 0.05)', padding: '10px 15px', borderRadius: '8px', border: '1px dashed rgba(255, 85, 85, 0.2)', color: '#ff5555' }}>
              CONNECTION ERROR: {error}
            </div>
            <button className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.75rem', padding: '6px 15px' }} onClick={fetchLogs}>Try Reconnect</button>
          </div>
        ) : (
          logs.map((line, i) => <div key={i}>{formatLog(line)}</div>)
        )}
      </div>
    </div>
  );
}
