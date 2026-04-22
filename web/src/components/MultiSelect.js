"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';

/**
 * MultiSelect - A premium, emoji-free multi-selection dropdown
 * @param {Array} options - [{ id: 'v', name: 'L' }, ...]
 * @param {Array} value - Array of selected IDs
 * @param {function} onChange - Callback function passing new array of IDs
 * @param {string} placeholder - Placeholder text
 */
export default function MultiSelect({ options = [], value = [], onChange, placeholder = "Select options..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedItems = options.filter(opt => value.includes(opt.id || opt));
  const filteredOptions = options.filter(opt => 
    (opt.name || opt).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    const newValue = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(newValue);
  };

  const removeTag = (e, id) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== id));
  };

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className={`select-box ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="selected-tags">
          {selectedItems.length > 0 ? (
            selectedItems.map(item => (
              <div key={item.id || item} className="tag">
                <span>{item.name || item}</span>
                <X 
                  size={14} 
                  className="tag-remove" 
                  onClick={(e) => removeTag(e, item.id || item)} 
                />
              </div>
            ))
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="options-list">
            {filteredOptions.map(option => {
              const isSelected = value.includes(option.id || option);
              return (
                <div 
                  key={option.id || option} 
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOption(option.id || option)}
                >
                  <div className="checkbox">
                    {isSelected && <Check size={12} />}
                  </div>
                  <span className="option-label">{option.name || option}</span>
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="no-results">No matches found</div>
            )}
          </div>

          <div className="dropdown-footer">
             <span>{value.length} selected</span>
             <button className="clear-btn" onClick={() => onChange([])}>Clear All</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .multi-select-container { position: relative; width: 100%; user-select: none; }
        .select-box {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 0.6rem 1rem; cursor: pointer; transition: all 0.2s;
          min-height: 48px;
        }
        .select-box:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15); }
        .select-box.open { border-color: var(--accent-color); background: rgba(123, 44, 191, 0.06); }
        
        .selected-tags { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; margin-right: 10px; }
        .tag {
          display: flex; align-items: center; gap: 6px;
          background: rgba(123, 44, 191, 0.15); border: 1px solid rgba(123, 44, 191, 0.3);
          color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem;
          animation: tagPop 0.2s ease-out;
        }
        @keyframes tagPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .tag-remove { cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        .tag-remove:hover { opacity: 1; }
        
        .placeholder { color: rgba(255, 255, 255, 0.3); font-size: 0.95rem; }
        .chevron { color: rgba(255, 255, 255, 0.3); transition: transform 0.2s; }
        .chevron.rotate { transform: rotate(180deg); }
        
        .dropdown-menu {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0;
          background: rgba(15, 15, 25, 0.95); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6); z-index: 2000; overflow: hidden;
          animation: menuSlide 0.2s ease-out;
        }
        @keyframes menuSlide { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .search-wrapper { padding: 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .search-icon { color: rgba(255, 255, 255, 0.3); }
        .search-input { flex: 1; background: none; border: none; color: white; outline: none; font-size: 0.95rem; }
        
        .options-list { max-height: 250px; overflow-y: auto; padding: 8px; }
        .option-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px;
          border-radius: 10px; cursor: pointer; transition: all 0.2s;
          color: rgba(255, 255, 255, 0.6);
        }
        .option-item:hover { background: rgba(255, 255, 255, 0.05); color: white; }
        .option-item.selected { background: rgba(123, 44, 191, 0.08); color: white; }
        
        .checkbox {
          width: 18px; height: 18px; border-radius: 4px;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .selected .checkbox { background: var(--accent-color); border-color: var(--accent-color); }
        
        .no-results { padding: 20px; text-align: center; color: rgba(255, 255, 255, 0.3); font-size: 0.9rem; }
        
        .dropdown-footer {
          padding: 10px 16px; border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.8rem; color: rgba(255, 255, 255, 0.4);
        }
        .clear-btn { background: none; border: none; color: var(--accent-color); cursor: pointer; font-weight: 600; }
        .clear-btn:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
