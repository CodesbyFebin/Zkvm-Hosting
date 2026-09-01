import React, { useState, useEffect } from 'react';

// Isolated in its own component so its 10x/second state updates don't
// re-render the rest of the page.
export default function MatrixRain() {
  const [matrixChars, setMatrixChars] = useState([]);

  useEffect(() => {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const initial = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      char: chars[Math.floor(Math.random() * chars.length)],
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.1 + Math.random() * 0.3,
    }));
    setMatrixChars(initial);

    const interval = setInterval(() => {
      setMatrixChars(prev => prev.map(c => ({
        ...c,
        y: (c.y + c.speed) % 100,
        char: chars[Math.floor(Math.random() * chars.length)],
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {matrixChars.map(c => (
        <div
          key={c.id}
          className="absolute font-mono text-[10px]"
          style={{ left: `${c.x}%`, top: `${c.y}%`, color: '#00ff41', opacity: c.opacity }}
        >
          {c.char}
        </div>
      ))}
    </div>
  );
}
