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
    <div className="floating-bg-container" ref={containerRef}>
      <div 
        className="floating-blob blob-1" 
        style={{ transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)` }}
      ></div>
      <div 
        className="floating-blob blob-2" 
        style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}
      ></div>
      <div 
        className="floating-blob blob-3" 
        style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.8}px)` }}
      ></div>
      
      <div className="bg-grid"></div>

      <style jsx>{`
        .floating-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          overflow: hidden;
          background: #0a0a0f;
          pointer-events: none;
        }

        .bg-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
        }

        .floating-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1);
        }

        .blob-1 {
          top: 10%;
          right: 15%;
          width: 400px;
          height: 400px;
          background: var(--accent-color, #7b2cbf);
          animation: float 20s infinite alternate;
        }

        .blob-2 {
          bottom: 10%;
          left: 10%;
          width: 500px;
          height: 500px;
          background: #3c096c;
          animation: float 25s infinite alternate-reverse;
        }

        .blob-3 {
          top: 40%;
          left: 30%;
          width: 300px;
          height: 300px;
          background: #9d4edd;
          animation: float 15s infinite alternate;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 50px) scale(1.1); }
          100% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
