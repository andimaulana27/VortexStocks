"use client";

import React, { useState } from 'react';
import { Settings2, Plus, Trash2, Save, Play, Info } from 'lucide-react';

const CreateScreener = () => {
  // State dummy untuk mendemonstrasikan UI penambahan rule (aturan)
  const [rules, setRules] = useState([
    { id: 1, indicator: 'MA 20', operator: '>', value: 'MA 50' }
  ]);

  const addRule = () => {
    setRules([...rules, { id: Date.now(), indicator: 'Volume', operator: '>', value: '100000' }]);
  };

  const removeRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col w-full h-full shadow-lg animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d] shrink-0 bg-[#1e1e1e]/40 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-lg flex items-center justify-center border border-[#8b5cf6]/20">
            <Settings2 size={20} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Buat Screener Kustom</h2>
            <p className="text-neutral-500 text-[12px]">Rancang logika filter saham Anda menggunakan indikator teknikal & fundamental.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-neutral-500 text-white text-[12px] font-bold rounded-lg transition-all">
            <Save size={14} /> Simpan Preset
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-[12px] font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
            <Play size={14} /> Run Screener
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Filter Builder */}
        <div className="w-[60%] flex flex-col border-r border-[#2d2d2d] p-6 overflow-y-auto custom-tv-scroll">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-[14px]">Parameter Kondisi (Rules)</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 bg-[#1e1e1e] px-2 py-1 rounded-md border border-[#2d2d2d]">
              <Info size={12} className="text-[#0ea5e9]" /> Hubungan antar rule adalah &quot;AND&quot;
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-3 bg-[#1e1e1e]/60 p-3 rounded-xl border border-[#2d2d2d] group">
                <span className="text-[10px] font-black text-neutral-500 w-4">{index + 1}.</span>
                
                {/* Dummy Selectors untuk UI */}
                <select className="flex-1 bg-[#121212] border border-[#2d2d2d] text-white text-[12px] px-3 py-2 rounded-lg focus:outline-none focus:border-[#8b5cf6] cursor-pointer">
                  <option value={rule.indicator}>{rule.indicator}</option>
                  <option value="MACD">MACD Line</option>
                  <option value="RSI">RSI (14)</option>
                  <option value="Close">Close Price</option>
                </select>

                <select className="w-[80px] bg-[#121212] border border-[#2d2d2d] text-white text-[12px] font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-[#8b5cf6] cursor-pointer text-center">
                  <option value={rule.operator}>{rule.operator}</option>
                  <option value="<">{'<'}</option>
                  <option value="=">=</option>
                  <option value="CrossUp">Cross Up</option>
                </select>

                <input 
                  type="text" 
                  defaultValue={rule.value}
                  className="flex-1 bg-[#121212] border border-[#2d2d2d] text-white text-[12px] px-3 py-2 rounded-lg focus:outline-none focus:border-[#8b5cf6]"
                />

                <button 
                  onClick={() => removeRule(rule.id)}
                  className="p-2 text-neutral-500 hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={addRule}
            className="flex items-center justify-center gap-2 w-full py-3 border border-[#2d2d2d] border-dashed rounded-xl text-neutral-400 hover:text-white hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/5 text-[12px] font-bold transition-all"
          >
            <Plus size={16} /> Tambah Parameter Baru
          </button>
        </div>

        {/* Right Panel: Preview / Info */}
        <div className="flex-1 bg-[#1e1e1e]/20 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-[#121212] border border-[#2d2d2d] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
             <Settings2 size={24} className="text-[#8b5cf6]" />
          </div>
          <h3 className="text-white font-bold text-[15px] mb-2">Engine Siap Dijalankan</h3>
          <p className="text-neutral-500 text-[12px] max-w-[250px]">
            Susun parameter di sebelah kiri, lalu klik <span className="text-[#10b981] font-bold">Run Screener</span> untuk melihat daftar saham yang memenuhi kriteria Anda.
          </p>
        </div>

      </div>
    </div>
  );
};

export default CreateScreener;