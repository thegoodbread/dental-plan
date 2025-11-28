import React, { useState, useMemo } from 'react';
import { getFeeSchedule } from '../services/treatmentPlans';
import { FeeScheduleEntry } from '../types';
import { Search } from 'lucide-react';

interface ProcedureSelectorProps {
  onSelect: (entry: FeeScheduleEntry) => void;
  className?: string;
}

export const ProcedureSelector: React.FC<ProcedureSelectorProps> = ({ onSelect, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const fees = useMemo(() => getFeeSchedule(), []);

  const filteredFees = useMemo(() => {
    if (!searchTerm) return fees;
    const lower = searchTerm.toLowerCase();
    return fees.filter(f => 
      f.procedureCode.toLowerCase().includes(lower) || 
      f.procedureName.toLowerCase().includes(lower)
    );
  }, [fees, searchTerm]);

  const handleSelect = (fee: FeeScheduleEntry) => {
    onSelect(fee);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search procedure code or name..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow click
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredFees.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No procedures found</div>
          ) : (
            filteredFees.map(fee => (
              <button
                key={fee.id}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-0"
                onClick={() => handleSelect(fee)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{fee.procedureName}</div>
                  <div className="text-xs text-gray-500">{fee.procedureCode} • {fee.category}</div>
                </div>
                <div className="text-sm font-medium text-blue-600">
                  ${fee.baseFee.toFixed(2)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
