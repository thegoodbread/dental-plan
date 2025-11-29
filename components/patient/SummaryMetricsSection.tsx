
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
    <div className="bg-purple-50 p-8 rounded-3xl text-center border border-purple-100">
      <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-4xl font-black text-purple-900">{value}</div>
    </div>
  );

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
            <Clock className="text-purple-500" />
            <h2 className="font-bold text-xl text-gray-900">How Long It Takes</h2>
        </div>
        <div className="mb-8">
            <p className="text-gray-500">Estimated commitment for your treatment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard label="Est. Visits" value={visitCount} />
          <MetricCard label="Phases" value={phaseCount} />
          <MetricCard label="Procedures" value={procedureCount} />
        </div>
      </div>
    </section>
  );
};
