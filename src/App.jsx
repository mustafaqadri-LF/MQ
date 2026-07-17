import React, { useState } from 'react';
import { AppWindow, Network } from 'lucide-react';
import AppProvisioning from './AppProvisioning.jsx';
import ArchitectureSimulator from './ArchitectureSimulator.jsx';

export default function App() {
  const [page, setPage] = useState('architecture');

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-300 tracking-tight">LFAMP Simulations</span>
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setPage('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${page === 'architecture' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <Network className="w-3.5 h-3.5" /> Architecture Flow
            </button>
            <button
              onClick={() => setPage('provisioning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${page === 'provisioning' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <AppWindow className="w-3.5 h-3.5" /> App Provisioning
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {page === 'architecture' ? <ArchitectureSimulator /> : <AppProvisioning />}
    </div>
  );
}
