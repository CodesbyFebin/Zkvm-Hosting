import React from 'react';
import { Link } from 'react-router-dom';
import { REPO } from '../lib/constants';

export default function Footer() {
  return (
    <footer className="border-t border-[#00ff41]/20 bg-black/50 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-[#00ff41]/30 flex items-center justify-center">
            <span className="font-mono text-[#00ff41] font-bold text-sm">Z</span>
          </div>
          <div>
            <div className="font-mono text-xs text-white">zkVM<span className="text-[#00ff41]">.host</span></div>
            <div className="font-mono text-[9px] text-gray-600">STARK-VERIFIABLE COMPUTE</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] text-gray-500">
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-[#00ff41]">◇ GitHub</a>
          <a href="/blog/" className="hover:text-[#00ff41]">&lt;/&gt; Blog</a>
          <a href="/glossary/" className="hover:text-[#00ff41]">◉ Glossary</a>
          <a href="/dashboard/" className="hover:text-[#00ff41]">▤ Dashboard</a>
          <a href={`${REPO}/tree/main/funding`} target="_blank" rel="noreferrer" className="hover:text-[#00ff41]">♡ Funding</a>
          <Link to="/contributing" className="hover:text-[#00ff41]">⚒ Contributing</Link>
          <Link to="/security" className="hover:text-[#00ff41]">⚑ Security</Link>
        </div>
      </div>
    </footer>
  );
}
