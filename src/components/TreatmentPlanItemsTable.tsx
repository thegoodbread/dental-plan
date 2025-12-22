import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry, UrgencyLevel, AddOnKind, FeeScheduleType } from '../types';
import { TreatmentPlanItemRow } from './TreatmentPlanItemRow';
import { ProcedurePickerModal } from './procedures/ProcedurePickerModal';
import { SedationManagerModal } from './SedationManagerModal';
import { Plus, Search, Library, Calculator, AlertTriangle, Smile, Clock, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { ToothSelectorModal } from './ToothSelectorModal';
import { NumberPadModal } from './NumberPadModal';
import { createSedationItem, createAddOnItem, checkAddOnCompatibility, AddOnDefinition } from '../services/treatmentPlans';
import { computeItemPricing } from '../utils/pricingLogic';
import { getProcedureDisplayName, getProcedureDisplayCode } from '../utils/procedureDisplay';

const NumpadButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-2.5 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg border border-gray-300"
    aria-label="Open number pad"
  >
    <Calculator size={18} />
  </button>
);

const MobileItemCard: React.FC<{
  item: TreatmentPlanItem;
  feeScheduleType: FeeScheduleType;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDelete: (id: string) => void;
}> = ({ item, feeScheduleType, onUpdate, onDelete }) => {
  const pricing = computeItemPricing(item, feeScheduleType);
  const displayName = getProcedureDisplayName(item);
  const displayCode = getProcedureDisplayCode(item);
  const needsLabel = displayName === "Needs label" || item.isCustomProcedureNameMissing;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`font-bold text-sm truncate ${needsLabel ? 'text-red-500 italic' : 'text-gray-900'}`}>{displayName}</div>
            {needsLabel && <AlertCircle size={14} className="text-red-500 animate-pulse shrink-0" />}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">{displayCode}</div>
        </div>
        <div className="text-right ml-4">
          <div className="font-bold text-gray-900 text-sm">${pricing.netFee.toFixed(2)}</div>
          {pricing.memberSavings > 0 && (
            <div className="text-[10px] text-green-600 font-semibold">Save ${pricing.memberSavings.toFixed(0)}</div>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
           {item.units} unit{item.units > 1 ? 's' : ''}
        </div>
        <button 
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

interface TreatmentPlanItemsTableProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onAddItem: (feeEntry: any) => void;
  onUpdateItem: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDeleteItem: (id: string) => void;
  onRefresh?: () => void;
  isLibraryOpen?: boolean;
  onToggleLibrary?: () => void;
  draggingAddOnKind?: AddOnKind | null;
  activeAddOn?: AddOnDefinition | null; // For Click-to-Assign "Stamp Mode"
  onAttachAddOn?: (procedureId: string) => void;
}

export const TreatmentPlanItemsTable: React.FC<TreatmentPlanItemsTableProps> = ({
  plan, items, onAddItem, onUpdateItem, onDeleteItem, onRefresh,
  isLibraryOpen, onToggleLibrary, draggingAddOnKind, activeAddOn, onAttachAddOn
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [sedationModalOpen, setSedationModalOpen] = useState(false);
  const [preselectedSedationParent, setPreselectedSedationParent] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const discount = plan.clinicDiscount || 0;
  const insurance = plan.estimatedInsurance || 0;
  const isMembership = plan.feeScheduleType === 'membership';
  const standardTotal = plan.totalFee + (plan.membershipSavings || 0);

  // Grouping Logic for Clinical View
  const rootItems = items.filter(i => i.itemType !== 'ADDON');
  const addOnItems = items.filter(i => i.itemType === 'ADDON');

  const handleAddSedationClick = (parentItemId: string) => {
    setPreselectedSedationParent(parentItemId);
    setSedationModalOpen(true);
  };

  const handleSedationConfirm = (data: { sedationType: string, appliesToItemIds: string[], fee: number }) => {
     if (!preselectedSedationParent) return;
     const parent = items.find(i => i.id === preselectedSedationParent);
     if (!parent || !parent.phaseId) {
         alert("Cannot add sub-item: Procedure must be assigned to a phase first.");
         return;
     }

     createSedationItem(plan.id, {
         ...data,
         phaseId: parent.phaseId
     });
     
     if (onRefresh) onRefresh();
     else onUpdateItem(preselectedSedationParent, {}); 
  };
  
  const getPhaseItemsForModal = () => {
      if (!preselectedSedationParent) return [];
      const parent = items.find(i => i.id === preselectedSedationParent);
      if (!parent || !parent.phaseId) return [];
      return items.filter(i => i.phaseId === parent.phaseId && i.itemType !== 'ADDON');
  };

  // Drag & Drop Handlers
  const handleDragOverRow = (e: React.DragEvent, item: TreatmentPlanItem) => {
      // 1. Mandatory preventDefault to enable drop registration
      e.preventDefault();
      e.stopPropagation();

      // 2. Compatibility Check
      if (draggingAddOnKind) {
          if (!checkAddOnCompatibility(draggingAddOnKind, item.category)) {
              return;
          }
      }
      
      setDragOverItemId(item.id);
  };

  const handleDragLeaveRow = (e: React.DragEvent, item: TreatmentPlanItem) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (dragOverItemId === item.id) setDragOverItemId(null);
  };

  const handleDropOnRow = (e: React.DragEvent, targetItem: TreatmentPlanItem) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverItemId(null);
      
      // Support both JSON MIME and plain text for wider browser support
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!rawData) return;

      try {
          const data = JSON.parse(rawData);
          if (data.type === 'ADDON_TEMPLATE') {
              const definition = data as AddOnDefinition;
              
              if (!checkAddOnCompatibility(definition.kind, targetItem.category)) {
                  alert(`Cannot attach ${definition.label} to this procedure type.`);
                  return;
              }

              createAddOnItem(plan.id, {
                  addOnKind: definition.kind,
                  procedureName: definition.label,
                  baseFee: plan.feeScheduleType === 'membership' && definition.membershipFee ? definition.membershipFee : definition.defaultFee,
                  phaseId: targetItem.phaseId || '',
                  linkedItemIds: [targetItem.id],
                  category: definition.category,
                  procedureCode: definition.defaultCode
              });

              if (onRefresh) onRefresh();
              else onUpdateItem(targetItem.id, {});
          }
      } catch (err) {
          console.error("Add-on drop processing error", err);
      }
  };

  return (
    <div 
        className="bg-white md:rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-row h-full relative rounded-lg"
        onDragOver={e => e.preventDefault()} // Ensure container permits drag passing
    >
      <div className="flex-1 flex flex-col min-w-0">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3 w-64 bg-gray-50 border-b border-gray-100">Procedure</th>
                  <th className="px-4 py-3 w-48 bg-gray-50 border-b border-gray-100">Tooth / Area</th>
                  <th className="px-4 py-3 text-right w-40 bg-gray-50 border-b border-gray-100">Cost</th>
                  <th className="px-4 py-3 text-center w-16 bg-gray-50 border-b border-gray-100">Qty</th>
                  <th className="px-4 py-3 text-right w-24 bg-gray-50 border-b border-gray-100">Net Fee</th>
                  <th className="px-4 py-3 w-20 bg-gray-50 border-b border-gray-100"></th>
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
                
                {rootItems.map(item => {
                   const linkedAddOns = addOnItems.filter(s => s.linkedItemIds && s.linkedItemIds[0] === item.id);
                   const isCompatible = draggingAddOnKind ? checkAddOnCompatibility(draggingAddOnKind, item.category) : 
                                       activeAddOn ? checkAddOnCompatibility(activeAddOn.kind, item.category) : false;

                   return (
                    <React.Fragment key={item.id}>
                        <TreatmentPlanItemRow
                            item={item}
                            feeScheduleType={plan.feeScheduleType}
                            onUpdate={onUpdateItem}
                            onDelete={onDeleteItem}
                            onAddSedation={handleAddSedationClick} 
                            isDragOver={dragOverItemId === item.id}
                            onDragOver={(e) => handleDragOverRow(e, item)}
                            onDragLeave={(e) => handleDragLeaveRow(e, item)}
                            onDrop={(e) => handleDropOnRow(e, item)}
                            isCompatibleDropTarget={isCompatible}
                        />
                        
                        {/* Interactive Stamp Indicator */}
                        {activeAddOn && isCompatible && (
                            <tr className="bg-blue-50/20">
                                <td colSpan={6} className="px-4 py-1.5 border-b border-blue-100">
                                    <button 
                                        onClick={() => onAttachAddOn?.(item.id)}
                                        className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                    >
                                        <Plus size={12} strokeWidth={3}/> Attach {activeAddOn.label}
                                    </button>
                                </td>
                            </tr>
                        )}

                        {linkedAddOns.map(addon => {
                            const linkedNames = (addon.linkedItemIds || [])
                                .map(id => items.find(i => i.id === id)?.procedureName)
                                .filter((n): n is string => !!n);

                            return (
                                <TreatmentPlanItemRow
                                    key={addon.id}
                                    item={addon}
                                    feeScheduleType={plan.feeScheduleType}
                                    onUpdate={onUpdateItem}
                                    onDelete={onDeleteItem}
                                    isAddOn={true}
                                    linkedItemNames={linkedNames}
                                />
                            );
                        })}
                    </React.Fragment>
                   );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden p-4 space-y-4 flex-1 overflow-y-auto bg-gray-50">
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
                 feeScheduleType={plan.feeScheduleType}
                 onUpdate={onUpdateItem} 
                 onDelete={onDeleteItem} 
               />
            ))}
          </div>

          {/* Footer / Add Button */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-0 z-20 md:relative">
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => setIsPickerOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all hover:scale-[1.02]"
                >
                  <Plus size={18} />
                  Add Procedure
                </button>
                
                {onToggleLibrary && (
                    <button 
                    onClick={onToggleLibrary}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 font-medium text-sm px-4 py-2.5 rounded-lg transition-all border ${
                        isLibraryOpen 
                        ? 'bg-blue-100 text-blue-700 border-blue-200' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    >
                    <Library size={18} />
                    {isLibraryOpen ? 'Hide Library' : 'Add-Ons Library'}
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-wrap justify-between md:justify-end w-full md:gap-3 lg:gap-4 items-center">
              {isMembership && (
                <>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Standard</span>
                    <span className="text-base md:text-lg lg:text-xl font-bold text-gray-500 line-through">
                      ${standardTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
                </>
              )}
              
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">{isMembership ? 'Member Total' : 'Total'}</span>
                <span className="text-base md:text-lg lg:text-xl font-bold text-gray-900">${plan.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              {insurance > 0.005 && (
                <>
                  <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
                  <div className="flex flex-col items-center md:items-end">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Est. Insurance</span>
                    <span className="text-base md:text-lg lg:text-xl font-bold text-green-600">-${insurance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              {discount > 0.005 && (
                <>
                  <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
                  <div className="flex flex-col items-center md:items-end">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Discount</span>
                    <span className="text-base md:text-lg lg:text-xl font-bold text-green-600">-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
              
              <div className="flex flex-col items-end">
                 <span className="text-xs text-gray-500 uppercase font-semibold">Pt Portion</span>
                 <span className="text-base md:text-lg lg:text-xl font-bold text-blue-600">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
      </div>

      {/* Modals */}
      <ProcedurePickerModal 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={onAddItem}
      />
      
      <SedationManagerModal
        isOpen={sedationModalOpen}
        onClose={() => setSedationModalOpen(false)}
        onConfirm={handleSedationConfirm}
        phaseItems={getPhaseItemsForModal()}
        preselectedItemId={preselectedSedationParent}
        feeScheduleType={plan.feeScheduleType}
      />
    </div>
  );
};