
import React from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { Clock, CheckCircle2, FileText, Activity } from 'lucide-react';
import { ProcedureComposer } from './ProcedureComposer';

export const Timeline = () => {
  const { timeline } = useChairside();

  const getIcon = (type: string) => {
    switch(type) {
      case 'CHECK_IN': return <Clock size={24} />;
      case 'PROCEDURE': return <CheckCircle2 size={24} />;
      case 'NOTE': return <FileText size={24} />;
      case 'RADIOGRAPH': return <Activity size={24} />;
      default: return <Clock size={24} />;
    }
  };

  const getColor = (type: string) => {
    switch(type) {
      case 'CHECK_IN': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'PROCEDURE': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'NOTE': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'RADIOGRAPH': return 'bg-purple-50 text-purple-600 border-purple-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Today's Visit</h2>
        <div className="px-4 py-2 bg-white rounded-full border border-slate-200 text-sm font-bold text-slate-500 shadow-sm">
           {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <ProcedureComposer />

      <div className="space-y-6 relative before:absolute before:left-[35px] before:top-6 before:bottom-6 before:w-0.5 before:bg-slate-200">
        {timeline.map((event) => (
          <div key={event.id} className="relative pl-24 group">
            <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg z-10 ${getColor(event.type)}`}>
              {getIcon(event.type)}
            </div>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm active:scale-[0.99] transition-transform cursor-pointer">
               <div className="flex justify-between items-center gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-slate-900 text-xl leading-tight">{event.title}</h4>
                        {event.tooth && event.tooth.length > 0 && (
                             <div className="flex mt-2">
                               <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg border border-slate-200">
                                  Teeth #{event.tooth.join(', ')}
                               </span>
                             </div>
                        )}
                    </div>
                    {event.details && <p className="text-lg text-slate-500 mt-2 leading-relaxed font-medium">{event.details}</p>}
                  </div>
                  
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.provider && <div className="text-sm text-slate-400 font-bold">{event.provider}</div>}
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
