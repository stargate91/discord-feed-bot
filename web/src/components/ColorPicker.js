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
    <div className={`ui-color-picker ${disabled ? 'disabled' : ''}`} style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {/* Saturation & Value Square */}
      <div 
        ref={svPanelRef}
        className="ui-color-picker-panel"
        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
        onMouseDown={(e) => { !disabled && setIsDragging('sv'); handleSvMove(e); }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, #fff, transparent)' }}></div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, #000, transparent)' }}></div>
        <div 
          style={{ position: 'absolute', width: '12px', height: '12px', border: '2px solid white', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 5px rgba(0,0,0,0.5)', pointerEvents: 'none', left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        ></div>
      </div>

      {/* Hue Slider */}
      <div 
        ref={hueSliderRef}
        className="ui-color-picker-slider"
        onMouseDown={(e) => { !disabled && setIsDragging('h'); handleHueMove(e); }}
      >
        <div style={{ position: 'absolute', top: '50%', width: '6px', height: '18px', background: 'white', borderRadius: '3px', transform: 'translate(-50%, -50%)', boxShadow: '0 0 5px rgba(0,0,0,0.5)', pointerEvents: 'none', left: `${(hsv.h / 360) * 100}%` }}></div>
      </div>

      {/* Footer: Hex & Presets */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '10px', gap: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Hash size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <input 
            type="text" 
            style={{ background: 'transparent', border: 'none', color: 'white', fontFamily: 'monospace', fontSize: '0.85rem', width: '60px', outline: 'none' }}
            value={value?.replace('#', '')} 
            onChange={(e) => onChange('#' + e.target.value)}
            disabled={disabled}
          />
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: value }}></div>
        </div>
        
        <div style={{ display: 'flex', gap: '6px' }}>
          {PRESET_COLORS.map(c => (
            <div 
              key={c} 
              className="ui-color-picker-dot" 
              style={{ backgroundColor: c }}
              onClick={() => !disabled && onChange(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
