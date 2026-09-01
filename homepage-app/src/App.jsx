import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MatrixRain from './components/MatrixRain';
import Nav from './components/Nav';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Architecture from './pages/Architecture';
import Features from './pages/Features';
import Playground from './pages/Playground';
import Benchmarks from './pages/Benchmarks';
import Faq from './pages/Faq';
import GettingStarted from './pages/GettingStarted';
import ZkasmSpec from './pages/ZkasmSpec';
import ApiReference from './pages/ApiReference';
import Mcp from './pages/Mcp';
import Roadmap from './pages/Roadmap';
import OnchainVerifier from './pages/OnchainVerifier';
import ThreatModel from './pages/ThreatModel';
import Contracts from './pages/Contracts';
import Ci from './pages/Ci';
import Recursion from './pages/Recursion';
import Contributing from './pages/Contributing';
import Security from './pages/Security';
import CliReference from './pages/CliReference';
import Examples from './pages/Examples';
import Changelog from './pages/Changelog';
import GrantPitch from './pages/GrantPitch';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans overflow-x-hidden">
      <MatrixRain />

      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff41 2px, #00ff41 4px)' }}
      />

      <Nav />
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/features" element={<Features />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/benchmarks" element={<Benchmarks />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/zkasm-spec" element={<ZkasmSpec />} />
        <Route path="/api-reference" element={<ApiReference />} />
        <Route path="/mcp" element={<Mcp />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/onchain-verifier" element={<OnchainVerifier />} />
        <Route path="/threat-model" element={<ThreatModel />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/ci" element={<Ci />} />
        <Route path="/recursion" element={<Recursion />} />
        <Route path="/contributing" element={<Contributing />} />
        <Route path="/security" element={<Security />} />
        <Route path="/cli-reference" element={<CliReference />} />
        <Route path="/examples" element={<Examples />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/grant-pitch" element={<GrantPitch />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </div>
  );
}
