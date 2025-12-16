
import React from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { ArrowLeft, ZoomIn, ZoomOut, Contrast, Sun } from 'lucide-react';

export const RadiographViewer = () => {
  const { setCurrentView } = useChairside();

  return (
    <div className="flex flex-col h-full bg-black text-white">
       {/* Toolbar */}
       <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
         <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 hover:bg-gray-800 rounded-full">
               <ArrowLeft size={20} className="text-gray-300" />
            </button>
            <h2 className="text-xl font-bold">Full Mouth Series (FMX)</h2>
         </div>
         <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"><ZoomIn size={20} /></button>
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"><ZoomOut size={20} /></button>
            <div className="w-px h-6 bg-gray-700 mx-2"></div>
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"><Contrast size={20} /></button>
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"><Sun size={20} /></button>
         </div>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center bg-black">
          {/* Placeholder for X-Ray Grid */}
          <div className="grid grid-cols-4 gap-4 w-full h-full max-w-5xl aspect-video">
             {Array.from({ length: 16 }).map((_, i) => (
                 <div key={i} className="bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-gray-600 font-mono text-xs">
                    X-RAY {i + 1}
                 </div>
             ))}
          </div>
      </div>
    </div>
  );
};
