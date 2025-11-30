import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface HeaderSectionProps {
  planNumber: string;
  clinicName?: string;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({ 
  planNumber,
  clinicName = "DentalPlan Pro"
}) => {
  return (
    <div className="bg-white pt-6 pb-6 md:pt-10 md:pb-8 px-6 md:px-12 border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 md:mb-10 gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-blue-200 shadow-lg">
              D
            </div>
            <span className="text-base md:text-lg font-bold text-gray-900 tracking-tight">{clinicName}</span>
          </div>
          <div className="flex md:block justify-between items-center border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest md:text-right">Plan ID</div>
            <div className="font-mono text-xs md:text-sm text-gray-600">{planNumber}</div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide border border-blue-100">
            <ShieldCheck size={14} />
            Verified Treatment Plan
          </div>
          <div>
            <h1 className="text-3xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-3 md:mb-4">
              Treatment Roadmap for Your Smile
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed font-light">
              We’ve prepared a personalized roadmap to help you understand your care, costs, and next steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};