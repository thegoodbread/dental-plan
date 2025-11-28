
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface HeaderSectionProps {
  patientName: string;
  planNumber: string;
  clinicName?: string;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({ 
  patientName, 
  planNumber,
  clinicName = "DentalPlan Pro"
}) => {
  return (
    <div className="bg-white pt-10 pb-8 px-6 md:px-12 border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg">
              D
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">{clinicName}</span>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Plan ID</div>
            <div className="font-mono text-sm text-gray-600">{planNumber}</div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide border border-blue-100">
            <ShieldCheck size={14} />
            Verified Treatment Plan
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
              Hi {patientName},
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl leading-relaxed font-light">
              We’ve prepared a personalized treatment roadmap to restore your smile and health. Here is everything you need to know.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
