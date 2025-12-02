
import React from 'react';
import { useChairside } from '../../context/ChairsideContext';

// Sequential 1-32 ordering
const ALL_TEETH = [
  // Upper
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  // Lower
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
];

export const MiniToothChart = () => {
  const { selectedTeeth, toggleTooth } = useChairside();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Odontogram</h3>
      <div className="grid grid-cols-8 gap-1.5">
        {ALL_TEETH.map(tooth => (
          <button
            key={tooth}
            onClick={() => toggleTooth(tooth)}
            className={`
              aspect-square rounded flex items-center justify-center text-[10px] font-bold border transition-all
              ${selectedTeeth.includes(tooth) 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600'}
            `}
          >
            {tooth}
          </button>
        ))}
      </div>
    </div>
  );
};
