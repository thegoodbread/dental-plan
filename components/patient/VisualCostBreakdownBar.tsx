
import React from 'react';

interface VisualCostBreakdownBarProps {
  totalFee: number;
  membershipSavings: number;
  clinicSavings: number;
  insuranceCoverage: number;
  patientPortion: number;
}

const formatValue = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export const VisualCostBreakdownBar: React.FC<VisualCostBreakdownBarProps> = ({
  totalFee,
  membershipSavings,
  clinicSavings,
  insuranceCoverage,
  patientPortion,
}) => {
  if (totalFee <= 0.005) {
    return null;
  }

  const segments = [
    { key: 'membership', value: membershipSavings, color: 'bg-green-400', label: 'Membership Savings' },
    { key: 'clinic', value: clinicSavings, color: 'bg-emerald-500', label: 'Clinic Savings' },
    { key: 'insurance', value: insuranceCoverage, color: 'bg-sky-400', label: 'Est. Insurance Coverage' },
    { key: 'patient', value: patientPortion, color: 'bg-blue-500', label: 'Your Portion' },
  ]
  .map(s => ({ ...s, value: Math.max(0, s.value) }))
  .filter(s => s.value > 0.005 || (s.key === 'patient' && patientPortion >= 0));

  return (
    <div className="my-6">
      <div className="flex w-full h-4 rounded-full bg-slate-200 overflow-hidden shadow-inner" role="progressbar" aria-label="Cost breakdown">
        {segments.map(({ key, value, color, label }) => (
          <div
            key={key}
            className={`${color} h-full transition-all duration-300 ease-in-out`}
            style={{ flexGrow: value, flexBasis: 0 }}
            title={`${label}: $${formatValue(value)}`}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3">
        {segments.map(({ key, value, color, label }) => {
          // Patient portion always shown if >= 0, others only if > 0
          if (value < 0.01 && key !== 'patient') return null;

          return (
            <div key={key} className="flex items-center gap-2 text-xs sm:text-sm">
              <span className={`w-3 h-3 rounded-full ${color} shrink-0`}></span>
              <span className="text-gray-600 font-medium">{label}</span>
              <span className="font-bold text-gray-800">
                {key !== 'patient' 
                  ? `-$${formatValue(value)}` 
                  : `$${formatValue(value)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
