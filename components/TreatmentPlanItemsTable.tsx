import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry } from '../types';
import { TreatmentPlanItemRow } from './TreatmentPlanItemRow';
import { ProcedureSelector } from './ProcedureSelector';
import { Plus } from 'lucide-react';

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
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSelection = (fee: FeeScheduleEntry) => {
    onAddItem(fee);
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
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
            {items.length === 0 && !isAdding && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-400 text-sm">
                  No procedures added yet. Click "Add Item" to begin.
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

            {/* Add Row State */}
            {isAdding && (
              <tr className="bg-blue-50/50 animate-in fade-in duration-200">
                <td colSpan={9} className="p-2">
                  <div className="max-w-md">
                     <ProcedureSelector onSelect={handleAddSelection} className="w-full" />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 pl-1">
                    Select a procedure to add it to the plan...
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Add Button */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-2 rounded hover:bg-blue-100 transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        ) : (
          <button 
             onClick={() => setIsAdding(false)}
             className="text-gray-500 text-sm hover:underline px-3"
          >
            Cancel
          </button>
        )}

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
    </div>
  );
};
