
import React, { useState, useEffect } from 'react';
import { TreatmentPlanItem, FeeScheduleType } from '../types';
import { X, Check } from 'lucide-react';
import { SEDATION_TYPES } from '../services/treatmentPlans';

interface SedationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { sedationType: string, appliesToItemIds: string[], fee: number }) => void;
  phaseItems: TreatmentPlanItem[]; // Items in the current phase to link to
  preselectedItemId?: string | null;
  feeScheduleType?: FeeScheduleType;
}

export const SedationManagerModal: React.FC<SedationManagerModalProps> = ({
  isOpen, onClose, onConfirm, phaseItems, preselectedItemId, feeScheduleType = 'standard'
}) => {
  const [selectedType, setSelectedType] = useState(SEDATION_TYPES[2].label); // Default IV Moderate
  
  const getDefaultFee = (typeLabel: string) => {
      const def = SEDATION_TYPES.find(t => t.label === typeLabel);
      if (!def) return 0;
      return feeScheduleType === 'membership' ? (def.membershipFee ?? def.defaultFee) : def.defaultFee;
  };

  const [fee, setFee] = useState(getDefaultFee(SEDATION_TYPES[2].label));
  
  // Filter out existing sedation items from the selection list (can't sedate a sedation)
  const availableItems = phaseItems.filter(i => !(i.itemType === 'ADDON' && i.addOnKind === 'SEDATION'));
  
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    preselectedItemId ? [preselectedItemId] : []
  );

  useEffect(() => {
    if (isOpen) {
        // Reset/init fee when opening if needed, though state is usually kept
        // We rely on handleTypeChange mostly
    }
  }, [isOpen]);

  const handleTypeChange = (newType: string) => {
      setSelectedType(newType);
      setFee(getDefaultFee(newType));
  };

  const handleToggleItem = (id: string) => {
      setSelectedItemIds(prev => 
         prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };

  const handleSelectAll = () => {
      if (selectedItemIds.length === availableItems.length) {
          setSelectedItemIds([]);
      } else {
          setSelectedItemIds(availableItems.map(i => i.id));
      }
  };
  
  const handleSubmit = () => {
      if (selectedItemIds.length === 0) return;
      onConfirm({
          sedationType: selectedType,
          appliesToItemIds: selectedItemIds,
          fee: Number(fee)
      });
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h3 className="font-bold text-gray-900">Add Sedation</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-6">
           {/* Type Selector */}
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sedation Type</label>
              <select 
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedType}
                onChange={e => handleTypeChange(e.target.value)}
              >
                  {SEDATION_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
           </div>

           {/* Fee Input */}
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fee ($)</label>
              <input 
                type="number" 
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={fee}
                onChange={e => setFee(parseFloat(e.target.value))}
              />
              {feeScheduleType === 'membership' && (
                 <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1"><Check size={12}/> Member pricing applied</p>
              )}
           </div>

           {/* Linked Items */}
           <div>
              <div className="flex justify-between items-end mb-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase">Applies To</label>
                 <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {selectedItemIds.length === availableItems.length ? 'Deselect All' : 'Select All'}
                 </button>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto bg-gray-50">
                  {availableItems.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">No procedures in this phase.</div>
                  ) : (
                      availableItems.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleToggleItem(item.id)}
                            className="p-3 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors"
                          >
                             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedItemIds.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                 {selectedItemIds.includes(item.id) && <Check size={14} className="text-white"/>}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <div className="text-sm font-medium text-gray-900 truncate">{item.procedureName}</div>
                                 <div className="text-xs text-gray-500">{item.procedureCode}</div>
                             </div>
                          </div>
                      ))
                  )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                  Sedation will be linked to these procedures and appear nested under them.
              </p>
           </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
            <button 
                onClick={handleSubmit} 
                disabled={selectedItemIds.length === 0}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Add Sedation
            </button>
        </div>
      </div>
    </div>
  );
};