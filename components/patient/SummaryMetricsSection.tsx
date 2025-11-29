import React from 'react';
import { Clock } from 'lucide-react';

interface SummaryMetricsSectionProps {
  visitCount: number;
  phaseCount: number;
  procedureCount: number;
}

export const SummaryMetricsSection: React.FC<SummaryMetricsSectionProps> = ({ 
  visitCount, 
  phaseCount, 
  procedureCount
}) => {
  
  const MetricCard = ({ label, value }: { label: string, value: number }) => (
    <div className="bg-purple-50 p-3 md:p-8 rounded-2xl md:rounded-3xl text-center border border-purple-100">
      <div className="text-[10px] md:text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 md:mb-2 truncate">{label}</div>
      <div className="text-2xl md:text-4xl font-black text-purple-900">{value}</div>
    </div>
  );

  return (
    <section className="py-8 md:py-16 px-4 md:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2 md:mb-8">
            <Clock className="text-purple-500" />
            <h2 className="font-bold text-xl text-gray-900">How Long It Takes</h2>
        </div>
        <div className="mb-6 md:mb-8 block md:hidden">
            <p className="text-sm text-gray-500">Estimated commitment for your treatment.</p>
        </div>
        <div className="hidden md:block mb-8">
            <p className="text-gray-500">Estimated commitment for your treatment.</p>
        </div>

        {/* 3 Columns on all screens */}
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <MetricCard label="Est. Visits" value={visitCount} />
          <MetricCard label="Phases" value={phaseCount} />
          <MetricCard label="Procedures" value={procedureCount} />
        </div>
      </div>
    </section>
  );
};