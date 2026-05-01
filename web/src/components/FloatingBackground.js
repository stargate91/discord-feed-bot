"use client";

import { useEffect, useState, useRef } from 'react';

export default function FloatingBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      
      setMousePos({ x: x * 20, y: y * 20 });

      // Handle individual parallax elements
      const elements = document.querySelectorAll('.parallax-element');
      elements.forEach(el => {
        const depth = el.getAttribute('data-depth') || 0.1;
        const moveX = x * (depth * 100);
        const moveY = y * (depth * 100);
        el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="ui-bg-parallax-container" ref={containerRef}>
      <div 
        className="ui-bg-blob" 
        style={{ 
          top: '10%', right: '15%', width: '400px', height: '400px', 
          background: 'var(--accent-color)', animation: 'ui-bg-float 20s infinite alternate',
          transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)` 
        }}
      ></div>
      <div 
        className="ui-bg-blob" 
        style={{ 
          bottom: '10%', left: '10%', width: '500px', height: '500px', 
          background: '#3c096c', animation: 'ui-bg-float 25s infinite alternate-reverse',
          transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` 
        }}
      ></div>
      <div 
        className="ui-bg-blob" 
        style={{ 
          top: '40%', left: '30%', width: '300px', height: '300px', 
          background: '#9d4edd', animation: 'ui-bg-float 15s infinite alternate',
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.8}px)` 
        }}
      ></div>
      
      <div className="ui-bg-grid"></div>
    </div>
  );
}
