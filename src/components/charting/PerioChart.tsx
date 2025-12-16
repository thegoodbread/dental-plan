
import React, { useState } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { ArrowLeft, Save } from 'lucide-react';

// Simplified for demo: Just a few teeth rows
const ROWS = ['Facial', 'Lingual'];

export const PerioChart = () => {
  const { setCurrentView, addTimelineEvent } = useChairside();
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const handleSave = () => {
    addTimelineEvent({
      type: 'PROCEDURE',
      title: 'Perio Charting Completed',
      details: 'Full mouth probing depths recorded.',
      provider: 'Hygienist Sarah'
    });
    setCurrentView('DASHBOARD');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
         <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 hover:bg-gray-100 rounded-full">
               <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Perio Charting</h2>
         </div>
         <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Reset</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Save size={16} /> Save Chart
            </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
         {/* Main Chart Area */}
         <div className="flex-1 overflow-auto p-6">
            <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
               {/* Simplified Grid Construction */}
               <div className="grid grid-cols-[100px_repeat(16,_minmax(40px,_1fr))] divide-x divide-gray-200 border-b border-gray-200">
                   <div className="p-2 bg-gray-50 font-bold text-gray-500 text-xs flex items-center justify-center">Tooth #</div>
                   {Array.from({ length: 16 }, (_, i) => i + 1).map(t => (
                      <div key={t} className="p-2 bg-gray-50 font-bold text-center text-gray-700">{t}</div>
                   ))}
               </div>

               {/* Data Rows */}
               {['PD - Facial', 'PD - Lingual', 'GM - Facial', 'GM - Lingual'].map((label, rowIdx) => (
                   <div key={label} className="grid grid-cols-[100px_repeat(16,_minmax(40px,_1fr))] divide-x divide-gray-200 border-b border-gray-200 last:border-0">
                       <div className="p-2 bg-gray-50 font-medium text-xs text-gray-600 flex items-center px-4">{label}</div>
                       {Array.from({ length: 16 }, (_, i) => i + 1).map((t, i) => {
                           const cellId = `${rowIdx}-${t}`;
                           const isActive = activeCell === cellId;
                           return (
                              <div 
                                key={t} 
                                onClick={() => setActiveCell(cellId)}
                                className={`h-10 cursor-pointer flex items-center justify-center text-sm font-mono hover:bg-blue-50 transition-colors ${isActive ? 'bg-blue-100 ring-2 ring-inset ring-blue-500' : ''}`}
                              >
                                  {/* Mock Values */}
                                  {rowIdx < 2 ? [2,3,2,3,4,3,2,2,3,2,3,3,4,3,2,3][i] : ''}
                              </div>
                           );
                       })}
                   </div>
               ))}
            </div>

            <div className="mt-6 flex gap-6">
               <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-64">
                  <h4 className="font-bold text-sm text-gray-900 mb-3">Toggles</h4>
                  <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /> Bleeding (BOP)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /> Suppuration
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /> Furcation
                      </label>
                  </div>
               </div>
               
               {/* Legend Mockup */}
               <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                   Perio Trend Graph Placeholder
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
