
import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry, UrgencyLevel, AddOnKind } from '../types';
import { TreatmentPlanItemRow } from './TreatmentPlanItemRow';
import { ProcedurePickerModal } from './procedures/ProcedurePickerModal';
import { SedationManagerModal } from './SedationManagerModal';
import { Plus, Search, Library, Calculator, AlertTriangle, Smile, Clock, Edit2, Trash2, X } from 'lucide-react';
import { ToothSelectorModal } from './ToothSelectorModal';
import { NumberPadModal } from './NumberPadModal';
import { createSedationItem, createAddOnItem, checkAddOnCompatibility, AddOnDefinition } from '../services/treatmentPlans';

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

interface TreatmentPlanItemsTableProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onAddItem: (feeEntry: FeeScheduleEntry) => void;
  onUpdateItem: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDeleteItem: (id: string) => void;
  onRefresh?: () => void;
  isLibraryOpen?: boolean;
  onToggleLibrary?: () => void;
  draggingAddOnKind?: AddOnKind | null;
}

export const TreatmentPlanItemsTable: React.FC<TreatmentPlanItemsTableProps> = ({
  plan, items, onAddItem, onUpdateItem, onDeleteItem, onRefresh,
  isLibraryOpen, onToggleLibrary, draggingAddOnKind
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
     // Find phase of the parent
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
  
  // Helper to get phase items for sedation modal
  const getPhaseItemsForModal = () => {
      if (!preselectedSedationParent) return [];
      const parent = items.find(i => i.id === preselectedSedationParent);
      if (!parent || !parent.phaseId) return [];
      // Return all procedures in that phase
      return items.filter(i => i.phaseId === parent.phaseId && i.itemType !== 'ADDON');
  };

  // Drag & Drop Handlers
  const handleDragOverRow = (e: React.DragEvent, item: TreatmentPlanItem) => {
      if (draggingAddOnKind) {
          if (!checkAddOnCompatibility(draggingAddOnKind, item.category)) {
              // Not compatible, ensure we do NOT drop here and DO NOT show drop feedback
              return;
          }
      }

      // Check if dragging template
      if (e.dataTransfer.types.includes('application/json')) {
          e.preventDefault();
          e.stopPropagation();
          setDragOverItemId(item.id);
      }
  };

  const handleDropOnRow = (e: React.DragEvent, targetItem: TreatmentPlanItem) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverItemId(null);
      
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return;

      try {
          const data = JSON.parse(rawData);
          if (data.type === 'ADDON_TEMPLATE') {
              const definition = data as AddOnDefinition;
              
              if (!checkAddOnCompatibility(definition.kind, targetItem.category)) {
                  // This should ideally not happen if dragOver is handled correctly, but double check
                  alert(`Cannot attach ${definition.label} to this procedure type.`);
                  return;
              }

              createAddOnItem(plan.id, {
                  addOnKind: definition.kind,
                  label: definition.label,
                  fee: plan.feeScheduleType === 'membership' && definition.membershipFee ? definition.membershipFee : definition.defaultFee,
                  phaseId: targetItem.phaseId || '',
                  appliesToItemIds: [targetItem.id],
                  category: definition.category,
                  code: definition.defaultCode
              });

              if (onRefresh) onRefresh();
              else onUpdateItem(targetItem.id, {}); // Trigger fallback update
          }
      } catch (err) {
          console.error("Drop error", err);
      }
  };

  return (
    <div className="bg-white md:rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-row h-full relative rounded-lg">
      
      <div className="flex-1 flex flex-col min-w-0">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto flex-1 relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3 w-64 bg-gray-50">Procedure</th>
                  <th className="px-4 py-3 w-48 bg-gray-50">Tooth / Area</th>
                  <th className="px-4 py-3 text-right w-40 bg-gray-50">Cost</th>
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
                
                {rootItems.map(item => {
                   const linkedAddOns = addOnItems.filter(s => 
                       s.linkedItemIds && s.linkedItemIds[0] === item.id
                   );
                   
                   // Determine compatibility for visual feedback (glow)
                   const isCompatible = draggingAddOnKind ? checkAddOnCompatibility(draggingAddOnKind, item.category) : false;

                   return (
                    <React.Fragment key={item.id}>
                        <TreatmentPlanItemRow
                            item={item}
                            onUpdate={onUpdateItem}
                            onDelete={onDeleteItem}
                            onAddSedation={handleAddSedationClick} 
                            isDragOver={dragOverItemId === item.id}
                            onDragOver={(e) => handleDragOverRow(e, item)}
                            onDrop={(e) => handleDropOnRow(e, item)}
                            isCompatibleDropTarget={isCompatible}
                        />
                        {linkedAddOns.map(addon => {
                            const linkedNames = (addon.linkedItemIds || [])
                                .map(id => items.find(i => i.id === id)?.procedureName)
                                .filter((n): n is string => !!n);

                            return (
                                <TreatmentPlanItemRow
                                    key={addon.id}
                                    item={addon}
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
          <div className="md:hidden p-4 space-y-4 flex-1 overflow-y-auto">
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

// Internal Mobile Card Component
const MobileItemCard: React.FC<{
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDelete: (id: string) => void;
}> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [baseFee, setBaseFee] = useState(item.baseFee);
  const [urgency, setUrgency] = useState<UrgencyLevel>(item.urgency || 'ELECTIVE');
  const [isToothSelectorOpen, setIsToothSelectorOpen] = useState(false);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);

  const isAddOn = item.itemType === 'ADDON';

  const getLocation = () => {
    if (isAddOn) return item.addOnKind === 'SEDATION' ? 'Sedation' : 'Add-On';
    if (item.selectedTeeth?.length) return `Tooth: ${item.selectedTeeth.join(', ')}`;
    if (item.selectedQuadrants?.length) return `Quad: ${item.selectedQuadrants.join(', ')}`;
    if (item.selectedArches?.length) return `Arch: ${item.selectedArches.join(', ')}`;
    return 'Full Mouth';
  };

  const handleSaveAndClose = () => {
    onUpdate(item.id, { 
      baseFee: Number(baseFee), 
      urgency: isAddOn ? undefined : urgency 
    });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setBaseFee(item.baseFee);
    setUrgency(item.urgency || 'ELECTIVE');
    setIsEditing(false);
    setIsConfirmingDelete(false);
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

  const displayedSedationType = item.sedationType || item.procedureName.replace('Sedation – ', '');

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
      <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${isAddOn ? 'border-l-4 border-l-slate-400 bg-slate-50' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="w-full mr-4">
            <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.procedureName}</h4>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <code className="bg-gray-100 px-1 rounded">{item.procedureCode}</code>
              <span>{item.category}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
             <div className="font-bold text-gray-900">${item.netFee.toFixed(0)}</div>
             {item.units > 1 && <div className="text-xs text-gray-400">Qty: {item.units}</div>}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4 pt-3 mt-3 border-t border-gray-100">
            {/* Urgency Editor - Hide for AddOn */}
            {!isAddOn && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Urgency</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                  className="w-auto p-1.5 border border-gray-300 rounded text-sm text-gray-900 bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-500 block w-full"
                >
                  <option value="ELECTIVE">Elective</option>
                  <option value="SOON">Soon</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            )}
            
            {/* Fee Editor */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Cost {isAddOn ? '(Override)' : 'per unit'}</label>
                <div className="flex items-center gap-1.5 w-48">
                    <div className="relative grow">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                        <input 
                            type="number" 
                            className="w-full p-1.5 border rounded text-right pl-5 text-sm text-gray-900 bg-white"
                            value={baseFee}
                            onFocus={(e) => e.target.select()}
                            onChange={e => setBaseFee(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <NumpadButton onClick={() => setIsNumpadOpen(true)} />
                </div>
            </div>

            {/* Area Editor - Hide for AddOn */}
            {!isAddOn && (item.unitType === 'PER_TOOTH' || item.unitType === 'PER_QUADRANT' || item.unitType === 'PER_ARCH') && (
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
              {!isAddOn && <UrgencyBadge u={item.urgency || 'ELECTIVE'} />}
              <div className="font-medium text-xs md:text-sm">{getLocation()}</div>
            </div>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs text-red-700 font-medium">Sure?</span>
                <button onClick={() => onDelete(item.id)} className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-md">Confirm</button>
                <button onClick={() => setIsConfirmingDelete(false)} className="p-1.5 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md"><X size={12}/></button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setIsEditing(true); setBaseFee(item.baseFee); setUrgency(item.urgency || 'ELECTIVE'); }} className="text-blue-600 text-xs font-bold uppercase flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={() => setIsConfirmingDelete(true)} className="text-red-500 text-xs font-bold uppercase flex items-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
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
      
      <NumberPadModal
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        onDone={(newValue) => {
            setBaseFee(parseFloat(newValue) || 0);
            setIsNumpadOpen(false);
        }}
        initialValue={String(baseFee)}
        title="Base Fee ($)"
      />
    </>
  );
};
