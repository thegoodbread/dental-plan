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
    // TASK 1: Compress header area padding on mobile
    <div className="bg-white pt-4 pb-2 md:pt-8 md:pb-6 px-4 md:px-12 border-b border-slate-100">
      <div className="max-w-5xl mx-auto">
        {/* Top bar: Logo/Badge and Plan ID - TASK 1: Reduced bottom margin on mobile */}
        <div className="flex flex-row justify-between items-start mb-3 md:mb-8">
          {/* Left side: Grouped logo and badge */}
          <div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-blue-200 shadow-lg shrink-0">
                D
              </div>
              <span className="text-base md:text-lg font-bold text-gray-900 tracking-tight truncate">{clinicName}</span>
            </div>
            {/* TASK 3: Badge moved under logo, with reduced size and margin on mobile */}
            <div className="mt-2 md:mt-3">
              <div className="inline-flex items-center gap-1.5 md:gap-2 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] md:text-xs font-semibold uppercase tracking-wide border border-blue-100">
                <ShieldCheck size={12} />
                Verified Treatment Plan
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Plan ID</div>
            <div className="font-mono text-xs md:text-sm text-gray-600">{planNumber}</div>
          </div>
        </div>

        {/* Hero Text - Centered on mobile, tighter spacing */}
        {/* TASK 1 & 2: Reduced spacing between title and subtitle */}
        <div className="space-y-1 md:space-y-3 text-center md:text-left">
          {/* TASK 2: Reduced font size and adjusted leading for mobile */}
          <h1 className="text-2xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-snug md:leading-tight">
            Treatment Roadmap for Your Smile
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl leading-snug md:leading-relaxed font-light mx-auto md:mx-0">
            We’ve prepared a personalized roadmap to help you understand your care, costs, and next steps.
          </p>
        </div>
      </div>
    </div>
  );
};
