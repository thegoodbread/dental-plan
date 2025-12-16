
import React, { useState } from 'react';
import { MiniToothChart } from './MiniToothChart';
import { useChairside } from '../../context/ChairsideContext';
import { AlertTriangle, ImageIcon, Grid, List, Activity, ChevronRight } from 'lucide-react';

type ContextTab = 'TEETH' | 'XRAY' | 'PLAN' | 'ALERT';

const RadiographThumbnail = ({ label }: { label: string }) => (
  <div className="aspect-[4/3] rounded-2xl relative overflow-hidden bg-black group cursor-pointer border-4 border-slate-100 shadow-sm active:border-blue-500 active:scale-[0.98] transition-all">
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
       <ImageIcon size={40} className="text-slate-600 mb-2" />
       <span className="text-sm font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  </div>
);

export const ContextPane = () => {
  const { setCurrentView } = useChairside();
  const [activeTab, setActiveTab] = useState<ContextTab>('TEETH');

  const tabs: { id: ContextTab; icon: React.ElementType; label: string }[] = [
      { id: 'TEETH', icon: Grid, label: 'Teeth' },
      { id: 'XRAY', icon: ImageIcon, label: 'X-Rays' },
      { id: 'PLAN', icon: List, label: 'Plan' },
      { id: 'ALERT', icon: AlertTriangle, label: 'Alerts' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      
      {/* Tab Bar - Large Touch Targets */}
      <div className="flex p-3 bg-slate-50 gap-2 border-b border-slate-200 shrink-0">
         {tabs.map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ${
                    activeTab === tab.id 
                    ? 'bg-white shadow-md text-blue-600 ring-2 ring-blue-50' 
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
             >
                 <tab.icon size={24} strokeWidth={2.5} className="mb-1" />
                 <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
             </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        
        {/* TEETH TAB */}
        {activeTab === 'TEETH' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-50 p-6 rounded-3xl shadow-inner border border-slate-100">
                    <MiniToothChart />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Existing Restorations</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-base font-bold text-slate-900">#3 MOD Amalgam</span>
                            <span className="text-sm font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">2018</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-base font-bold text-slate-900">#14 DO Composite</span>
                            <span className="text-sm font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">2020</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-base font-bold text-slate-900">#30 PFM Crown</span>
                            <span className="text-sm font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">2015</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* X-RAY TAB */}
        {activeTab === 'XRAY' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                    onClick={() => setCurrentView('XRAY')}
                    className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    <ImageIcon size={24} /> Open Full Viewer
                </button>
                <div className="grid grid-cols-2 gap-4">
                    <RadiographThumbnail label="BWX Right" />
                    <RadiographThumbnail label="BWX Left" />
                    <RadiographThumbnail label="PA #3" />
                    <RadiographThumbnail label="PA #14" />
                    <RadiographThumbnail label="Pano" />
                </div>
            </div>
        )}

        {/* PLAN TAB */}
        {activeTab === 'PLAN' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-bold text-slate-900">Phase 1: Foundation</span>
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-black uppercase tracking-wide rounded-lg">Active</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
                        <div className="bg-green-500 h-3 rounded-full shadow-sm" style={{ width: '60%' }}></div>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-4 text-base font-medium text-slate-700 p-3 bg-slate-50 rounded-xl">
                            <div className="w-6 h-6 rounded-full border-4 border-green-500 flex items-center justify-center bg-white shrink-0"></div>
                            <span>SRP UR/LR</span>
                        </li>
                        <li className="flex items-center gap-4 text-base font-medium text-slate-700 p-3 bg-slate-50 rounded-xl">
                            <div className="w-6 h-6 rounded-full border-4 border-slate-300 bg-white shrink-0"></div>
                            <span>SRP UL/LL</span>
                        </li>
                    </ul>
                </div>
            </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'ALERT' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-red-50 rounded-3xl border-l-8 border-red-500 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-red-800">
                        <AlertTriangle size={32} strokeWidth={2.5} />
                        <h3 className="text-xl font-black uppercase tracking-tight">Medical Alerts</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="px-4 py-3 rounded-xl bg-white border border-red-200 text-base font-bold text-red-700 shadow-sm flex justify-between items-center">
                            Penicillin Allergy <AlertTriangle size={16}/>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white border border-red-200 text-base font-bold text-red-700 shadow-sm flex justify-between items-center">
                            Hypertension
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white border border-red-200 text-base font-bold text-red-700 shadow-sm flex justify-between items-center">
                            Joint Replacement (2022)
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 rounded-3xl border-l-8 border-amber-500 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-amber-800">
                        <Activity size={32} strokeWidth={2.5} />
                        <h3 className="text-xl font-black uppercase tracking-tight">Pre-Med</h3>
                    </div>
                    <p className="text-amber-900/80 text-lg font-medium mt-2">Amoxicillin 2g 1hr prior to appt.</p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
