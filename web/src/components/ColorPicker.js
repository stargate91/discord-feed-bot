"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Hash, Pipette } from 'lucide-react';

const PRESET_COLORS = [
  '#FF0000', // YouTube
  '#9146FF', // Twitch
  '#53fc18', // Kick
  '#ee802f', // RSS
  '#f3ba2f', // Crypto
  '#ffffff', // GitHub
  '#66c0f4', // Steam
  '#313131', // Epic Games
  '#9a42f4', // GOG
  '#01b4e4', // TMDB
  '#7b2cbf', // Nova
];

// Helper functions for color conversion
const hexToHsv = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h, s, v) => {
  h /= 360; s /= 100; v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function ColorPicker({ value, onChange, disabled = false }) {
  const [hsv, setHsv] = useState({ h: 260, s: 70, v: 70 });
  const [isDragging, setIsDragging] = useState(null); // 'sv' or 'h'
  const svPanelRef = useRef(null);
  const hueSliderRef = useRef(null);

  useEffect(() => {
    if (value && /^#[0-9A-F]{3,6}$/i.test(value)) {
      const newHsv = hexToHsv(value);
      setHsv(newHsv);
    }
  }, [value]);

  const updateColor = useCallback((newHsv) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onChange(hex);
  }, [onChange]);

  const handleSvMove = useCallback((e) => {
    if (!svPanelRef.current) return;
    const rect = svPanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateColor({ ...hsv, s: x * 100, v: (1 - y) * 100 });
  }, [hsv, updateColor]);

  const handleHueMove = useCallback((e) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateColor({ ...hsv, h: x * 360 });
  }, [hsv, updateColor]);

  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (isDragging === 'sv') handleSvMove(e);
      if (isDragging === 'h') handleHueMove(e);
    };
    const handleGlobalUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDragging, handleSvMove, handleHueMove]);

  return (
    <div className={`advanced-picker ${disabled ? 'disabled' : ''}`}>
      {/* Saturation & Value Square */}
      <div 
        ref={svPanelRef}
        className="sv-panel"
        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
        onMouseDown={(e) => { !disabled && setIsDragging('sv'); handleSvMove(e); }}
      >
        <div className="sv-white"></div>
        <div className="sv-black"></div>
        <div 
          className="sv-cursor" 
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        ></div>
      </div>

      {/* Hue Slider */}
      <div 
        ref={hueSliderRef}
        className="hue-slider"
        onMouseDown={(e) => { !disabled && setIsDragging('h'); handleHueMove(e); }}
      >
        <div className="hue-cursor" style={{ left: `${(hsv.h / 360) * 100}%` }}></div>
      </div>

      {/* Footer: Hex & Presets */}
      <div className="picker-footer">
        <div className="hex-display">
          <Hash size={14} />
          <input 
            type="text" 
            value={value?.replace('#', '')} 
            onChange={(e) => onChange('#' + e.target.value)}
            disabled={disabled}
          />
          <div className="color-preview-blob" style={{ backgroundColor: value }}></div>
        </div>
        
        <div className="mini-presets">
          {PRESET_COLORS.map(c => (
            <div 
              key={c} 
              className="mini-dot" 
              style={{ backgroundColor: c }}
              onClick={() => !disabled && onChange(c)}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .advanced-picker {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .disabled { opacity: 0.5; pointer-events: none; }

        .sv-panel {
          position: relative;
          height: 150px;
          width: 100%;
          border-radius: 12px;
          cursor: crosshair;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .sv-white {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to right, #fff, transparent);
        }

        .sv-black {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to top, #000, transparent);
        }

        .sv-cursor {
          position: absolute;
          width: 12px; height: 12px;
          border: 2px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
          pointer-events: none;
        }

        .hue-slider {
          position: relative;
          height: 12px;
          width: 100%;
          border-radius: 6px;
          background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hue-cursor {
          position: absolute;
          top: 50%;
          width: 6px; height: 18px;
          background: white;
          border-radius: 3px;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
          pointer-events: none;
        }

        .picker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .hex-display {
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.3);
          padding: 6px 10px;
          border-radius: 10px;
          gap: 6px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .hex-display input {
          background: transparent;
          border: none;
          color: white;
          font-family: monospace;
          font-size: 0.85rem;
          width: 60px;
          outline: none;
        }

        .color-preview-blob {
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .mini-presets {
          display: flex;
          gap: 6px;
        }

        .mini-dot {
          width: 14px; height: 14px;
          border-radius: 50%;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.2s;
        }

        .mini-dot:hover { transform: scale(1.3); }
      `}</style>
    </div>
  );
}
