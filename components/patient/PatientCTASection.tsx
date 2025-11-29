import React from 'react';
import { Phone, Calendar } from 'lucide-react';

export const PatientCTASection: React.FC = () => {
  return (
    <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 px-4 py-4 md:p-4 pb-6 md:pb-6 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="hidden md:block">
           <div className="text-sm font-bold text-gray-900">Questions about your treatment plan?</div>
           <div className="text-xs text-gray-500">Contact our office to schedule a consultation and discuss your options.</div>
        </div>
        <div className="flex w-full md:w-auto gap-3">
           <button className="flex-1 md:flex-none h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
             <Phone size={18} /> <span className="text-sm md:text-base">Call to Schedule</span>
           </button>
           <button className="flex-1 md:flex-none h-12 px-8 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:bg-gray-100">
             <Calendar size={18} /> <span className="text-sm md:text-base">Book Online</span>
           </button>
        </div>
      </div>
    </div>
  );
};