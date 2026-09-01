import React from 'react';

export default function PageHero({ eyebrow, title, accent, dek }) {
  return (
    <div className="text-center mb-16 max-w-3xl mx-auto animate-fadeUp">
      <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— {eyebrow} —</div>
      <h1 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
        {title} {accent && <span className="text-[#00ff41]">{accent}</span>}
      </h1>
      {dek && <p className="font-mono text-sm text-gray-500">{dek}</p>}
    </div>
  );
}
