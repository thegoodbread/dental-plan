

import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry, UrgencyLevel } from '../types';
import { TreatmentPlanItemRow } from './TreatmentPlanItemRow';
import { ProcedurePickerModal } from './procedures/ProcedurePickerModal';
import { Plus, Search, Edit2, Trash2, Smile, Clock, AlertTriangle } from 'lucide-react';
import { ToothSelectorModal } from './ToothSelectorModal';

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
  const discount = Math.max(0, plan.totalFee - (plan.estimatedInsurance || 0) - plan.patientPortion);

  return (
    <div className="bg-white md:rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative rounded-lg">
      
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto flex-1 relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="px-4 py-3 w-64 bg-gray-50">Procedure</th>
              <th className="px-4 py-3 w-48 bg-gray-50">Tooth / Area</th>
              <th className="px-4 py-3 text-right w-24 bg-gray-50">Cost</th>
              <th className="px-4 py-3 text-center w-16 bg-gray-50">Qty</th>
              <th className="px-4 py-3 text-right w-24 bg-gray-50">Net Fee</th>
              <th className="px-4 py-3 w-20 bg-gray-50"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
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

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden p-4 space-y-4">
        {items.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex w-12 h-12 rounded-full bg-blue-50 text-blue-500 items-center justify-center mb-2">
              <Search size={24} />
            </div>
            <p className="text-gray-500 font-medium text-sm">No procedures added yet.</p>
            <button 
              onClick={() => setIsPickerOpen(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-bold"
            >
              Add Your First Procedure
            </button>
          </div>
        )}
        
        {items.map((item) => (
           <MobileItemCard 
             key={item.id} 
             item={item} 
             onUpdate={onUpdateItem} 
             onDelete={onDeleteItem} 
           />
        ))}
      </div>

      {/* Footer / Add Button */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-0 z-20 md:relative">
        <button 
          onClick={() => setIsPickerOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all hover:scale-[1.02]"
        >
          <Plus size={18} />
          Add Procedure
        </button>

        <div className="flex justify-between md:justify-end w-full md:w-auto md:gap-4 items-center">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
            <span className="text-lg md:text-xl font-bold text-gray-900">${plan.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          {discount > 0.005 && (
            <>
              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
              <div className="flex flex-col items-center md:items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">Discount</span>
                <span className="text-lg md:text-xl font-bold text-green-600">-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
          
          <div className="flex flex-col items-end">
             <span className="text-xs text-gray-500 uppercase font-semibold">Pt Portion</span>
             <span className="text-lg md:text-xl font-bold text-blue-600">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

// Internal Mobile Card Component
const MobileItemCard: React.FC<{
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDelete: (id: string) => void;
}> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [baseFee, setBaseFee] = useState(item.baseFee);
  const [urgency, setUrgency] = useState<UrgencyLevel>(item.urgency || 'ELECTIVE');
  const [isToothSelectorOpen, setIsToothSelectorOpen] = useState(false);

  const getLocation = () => {
    if (item.selectedTeeth?.length) return `Tooth: ${item.selectedTeeth.join(', ')}`;
    if (item.selectedQuadrants?.length) return `Quad: ${item.selectedQuadrants.join(', ')}`;
    if (item.selectedArches?.length) return `Arch: ${item.selectedArches.join(', ')}`;
    return 'Full Mouth';
  };

  const handleSaveAndClose = () => {
    onUpdate(item.id, { baseFee: Number(baseFee), urgency });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setBaseFee(item.baseFee);
    setUrgency(item.urgency || 'ELECTIVE');
    setIsEditing(false);
  };

  const toggleQuadrant = (q: 'UR'|'UL'|'LL'|'LR') => {
    const current = item.selectedQuadrants || [];
    const updated = current.includes(q) 
      ? current.filter(x => x !== q)
      : [...current, q];
    onUpdate(item.id, { selectedQuadrants: updated });
  };

  const toggleArch = (a: 'UPPER'|'LOWER') => {
    const current = item.selectedArches || [];
    const updated = current.includes(a)
      ? current.filter(x => x !== a)
      : [...current, a];
    onUpdate(item.id, { selectedArches: updated });
  };

  const UrgencyBadge = ({ u }: { u: UrgencyLevel }) => {
    const styles: Record<UrgencyLevel, string> = {
      URGENT: "bg-red-50 text-red-600 border-red-100",
      SOON: "bg-orange-50 text-orange-600 border-orange-100",
      ELECTIVE: "bg-blue-50 text-blue-600 border-blue-100"
    };
    const icons: Record<UrgencyLevel, React.ReactNode> = {
      URGENT: <AlertTriangle size={10} />,
      SOON: <Clock size={10} />,
      ELECTIVE: <Smile size={10} />
    };
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${styles[u]}`}>
        {icons[u]} {u}
      </span>
    );
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.procedureName}</h4>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <code className="bg-gray-100 px-1 rounded">{item.procedureCode}</code>
              <span>{item.category}</span>
            </div>
          </div>
          <div className="text-right">
             <div className="font-bold text-gray-900">${item.netFee.toFixed(0)}</div>
             {item.units > 1 && <div className="text-xs text-gray-400">Qty: {item.units}</div>}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4 pt-3 mt-3 border-t border-gray-100">
            {/* Urgency Editor */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Urgency</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                className="w-auto p-1.5 border border-gray-300 rounded text-sm text-gray-900 bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ELECTIVE">Elective</option>
                <option value="SOON">Soon</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            
            {/* Fee Editor */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Cost per unit</label>
                <input 
                    type="number" 
                    className="w-24 p-1.5 border rounded text-right text-sm text-gray-900 bg-white"
                    value={baseFee}
                    onChange={e => setBaseFee(Number(e.target.value))}
                />
            </div>

            {/* Area Editor */}
            {(item.unitType === 'PER_TOOTH' || item.unitType === 'PER_QUADRANT' || item.unitType === 'PER_ARCH') && (
              <div>
                {item.unitType === 'PER_TOOTH' && (
                  <button
                    onClick={() => setIsToothSelectorOpen(true)}
                    className="w-full text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm border border-gray-200"
                  >
                    Change Selected Teeth
                  </button>
                )}
                {item.unitType === 'PER_QUADRANT' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Quadrants</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['UR', 'UL', 'LR', 'LL'] as const).map(q => (
                        <button
                          key={q}
                          onClick={() => toggleQuadrant(q)}
                          className={`py-2 text-xs rounded-lg border font-bold transition-colors ${
                            item.selectedQuadrants?.includes(q) 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {item.unitType === 'PER_ARCH' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Arch</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['UPPER', 'LOWER'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => toggleArch(a)}
                          className={`py-2 text-sm rounded-lg border font-bold transition-colors ${
                            item.selectedArches?.includes(a) 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button onClick={handleCancel} className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleSaveAndClose} className="flex-1 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 pt-3 mt-2">
            <div className="flex items-center gap-2">
              <UrgencyBadge u={item.urgency || 'ELECTIVE'} />
              <div className="font-medium">{getLocation()}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsEditing(true); setBaseFee(item.baseFee); setUrgency(item.urgency || 'ELECTIVE'); }} className="text-blue-600 text-xs font-bold uppercase flex items-center gap-1">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => onDelete(item.id)} className="text-red-500 text-xs font-bold uppercase flex items-center gap-1">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {item.unitType === 'PER_TOOTH' && (
        <ToothSelectorModal
            isOpen={isToothSelectorOpen}
            onClose={() => setIsToothSelectorOpen(false)}
            selectedTeeth={item.selectedTeeth || []}
            onChange={(teeth) => onUpdate(item.id, { selectedTeeth: teeth })}
        />
      )}
    </>
  );
};