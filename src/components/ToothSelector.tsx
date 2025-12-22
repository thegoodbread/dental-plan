import React from 'react';

interface ToothSelectorProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
  disabled?: boolean;
}

const ALL_UPPER = Array.from({ length: 16 }, (_, i) => i + 1);       // 1–16
const ALL_LOWER = Array.from({ length: 16 }, (_, i) => 17 + i);      // 17-32

export const ToothSelector: React.FC<ToothSelectorProps> = ({
  selectedTeeth,
  onChange,
  disabled = false,
}) => {
  const toggleTooth = (tooth: number) => {
    if (disabled) return;

    const isSelected = selectedTeeth.includes(tooth);
    const next = isSelected
      ? selectedTeeth.filter((t) => t !== tooth)
      : [...selectedTeeth, tooth].sort((a, b) => a - b);

    onChange(next);
  };

  const renderRow = (teeth: number[]) => (
    <div className="flex flex-nowrap gap-1 md:gap-1.5 justify-center">
      {teeth.map((tooth) => {
        const active = selectedTeeth.includes(tooth);
        return (
          <button
            key={tooth}
            type="button"
            disabled={disabled}
            className={`
              w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-full border text-[9px] sm:text-[10px] md:text-sm flex items-center justify-center transition-all
              ${active 
                ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm scale-110' 
                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={(e) => {
              e.stopPropagation();
              toggleTooth(tooth);
            }}
          >
            {tooth}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="inline-flex flex-col gap-1.5 md:gap-2.5 p-2 md:p-3 rounded-xl bg-gray-50 border border-gray-200 shadow-inner select-none w-full max-w-full overflow-x-auto no-scrollbar">
      <div className="text-[9px] md:text-[10px] uppercase text-gray-400 font-bold text-center tracking-wider">Upper</div>
      {renderRow(ALL_UPPER)}
      <div className="text-[9px] md:text-[10px] uppercase text-gray-400 font-bold text-center tracking-wider mt-1">Lower</div>
      {renderRow(ALL_LOWER)}
    </div>
  );
};