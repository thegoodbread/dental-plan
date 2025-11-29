
import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry } from '../types';
import { TreatmentPlanItemRow } from './TreatmentPlanItemRow';
import { ProcedurePickerModal } from './procedures/ProcedurePickerModal';
import { Plus, Search } from 'lucide-react';

interface TreatmentPlanItemsTableProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onAddItem: (feeEntry: FeeScheduleEntry) => void;
  onUpdateItem: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDeleteItem: (id: string) => void;
}

export const TreatmentPlanItemsTable: React.FC<TreatmentPlanItemsTableProps> = ({
  plan, items, onAddItem, onUpdateItem, onDeleteItem
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="px-4 py-3 w-64">Procedure</th>
              <th className="px-4 py-3 w-48">Tooth / Area</th>
              <th className="px-4 py-3 w-24">Unit Type</th>
              <th className="px-4 py-3 text-right w-24">Base Fee</th>
              <th className="px-4 py-3 text-center w-16">Qty</th>
              <th className="px-4 py-3 text-right w-24">Gross</th>
              <th className="px-4 py-3 text-right w-24">Disc</th>
              <th className="px-4 py-3 text-right w-24 bg-gray-50">Net Fee</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                      <Search size={24} />
                    </div>
                    <p className="text-gray-500 font-medium">No procedures added yet.</p>
                    <button 
                      onClick={() => setIsPickerOpen(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    >
                      Browse Procedure Library
                    </button>
                  </div>
                </td>
              </tr>
            )}
            
            {items.map(item => (
              <TreatmentPlanItemRow
                key={item.id}
                item={item}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Add Button */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
        <button 
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all hover:scale-[1.02]"
        >
          <Plus size={18} />
          Add Procedure
        </button>

        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Treatment</span>
            <span className="text-xl font-bold text-gray-900">${plan.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div className="flex flex-col items-end">
             <span className="text-xs text-gray-500 uppercase font-semibold">Patient Portion</span>
             <span className="text-xl font-bold text-blue-600">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ProcedurePickerModal 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={onAddItem}
      />
    </div>
  );
};
