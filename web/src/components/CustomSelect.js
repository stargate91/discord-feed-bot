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
    <div className="custom-select-wrapper" style={{ width }} ref={dropdownRef}>
      <div 
        className={`select-box ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!selectedOption ? 'placeholder' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="select-dropdown-menu">
          {options.map((option) => (
            <div 
              key={option.value} 
              className={`select-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {value === option.value && <div className="selected-dot"></div>}
            </div>
          ))}
          {options.length === 0 && <div className="no-options">No options available</div>}
        </div>
      )}

      <style jsx>{`
        .custom-select-wrapper {
          position: relative;
          user-select: none;
        }
        .select-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 0.8rem 1.2rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
          font-size: 0.95rem;
        }
        .select-box:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .select-box.open {
          border-color: var(--accent-color);
          background: rgba(123, 44, 191, 0.08);
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.15);
        }
        .placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .chevron-icon {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.3s ease;
        }
        .chevron-icon.rotate {
          transform: rotate(180deg);
        }
        .select-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: rgba(15, 15, 25, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
          z-index: 1000;
          padding: 8px;
          overflow: hidden;
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .select-item {
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
        }
        .select-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          padding-left: 18px;
        }
        .select-item.selected {
          background: rgba(123, 44, 191, 0.15);
          color: white;
          font-weight: 600;
        }
        .selected-dot {
          width: 6px;
          height: 6px;
          background: var(--accent-color);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-color);
        }
        .no-options {
          padding: 1rem;
          text-align: center;
          color: rgba(255, 255, 255, 0.3);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
