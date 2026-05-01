"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CustomSelect - A premium, emoji-free dropdown component
 * @param {Array} options - [{ value: 'v', label: 'L' }, ...]
 * @param {string} value - Selected value
 * @param {function} onChange - Callback function
 * @param {string} placeholder - Placeholder text
 * @param {string} width - Optional width (default 100%)
 */
export default function CustomSelect({ options, value, onChange, placeholder = "Select option...", width = "100%" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="ui-select-wrapper" style={{ width }} ref={dropdownRef}>
      <div 
        className={`ui-select-box ${isOpen ? 'ui-open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ opacity: !selectedOption ? 0.4 : 1 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} style={{ opacity: 0.4, transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && (
        <div className="ui-select-dropdown">
          {options.map((option) => (
            <div 
              key={option.value} 
              className={`ui-select-item ${value === option.value ? 'ui-selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {value === option.value && (
                <div style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-color)' }}></div>
              )}
            </div>
          ))}
          {options.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No options available</div>}
        </div>
      )}
    </div>
  );
}
