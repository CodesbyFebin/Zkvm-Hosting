import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { REPO, NAV_LINKS } from '../lib/constants';

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `font-mono text-xs uppercase tracking-widest transition-colors ${
      isActive ? 'text-[#00ff41]' : 'text-gray-500 hover:text-[#00ff41]'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#00ff41]/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#00ff41] flex items-center justify-center relative">
            <span className="font-mono text-[#00ff41] font-bold text-lg">Z</span>
            <div className="absolute inset-0 bg-[#00ff41]/5" />
          </div>
          <div>
            <div className="font-mono font-bold text-white tracking-wider">zkVM<span className="text-[#00ff41]">.host</span></div>
            <div className="text-[9px] text-gray-500 font-mono tracking-widest">STARK PROVING INFRASTRUCTURE</div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>
          ))}
          <a href="/blog/" className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-[#00ff41] transition-colors">Blog</a>
        </div>

        <div className="flex items-center gap-3">
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden md:inline-flex px-4 py-2 border border-[#00ff41]/30 text-[#00ff41] font-mono text-xs hover:bg-[#00ff41]/10 transition-colors">
            $ git clone
          </a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-[#00ff41] font-mono" aria-label="Toggle menu">
            [≡]
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#00ff41]/20 bg-black/95">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-6 py-3 font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-[#00ff41] hover:bg-[#00ff41]/5"
            >
              $ {label.toLowerCase()}
            </Link>
          ))}
          <a href="/blog/" className="block w-full text-left px-6 py-3 font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-[#00ff41] hover:bg-[#00ff41]/5">$ blog</a>
        </div>
      )}
    </nav>
  );
}
