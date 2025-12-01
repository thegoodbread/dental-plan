import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase, UrgencyLevel, PhaseBucketKey } from '../../types';
import { ArrowRight, GripVertical, Plus, Trash2, Calculator } from 'lucide-react';
import { NumberPadModal } from '../NumberPadModal';

const PHASE_PRESETS = ["Foundation & Diagnostics", "Restorative", "Implant & Surgical", "Elective / Cosmetic", "Prosthetics", "Orthodontics", "Monitoring", "Follow-up"];

const NumpadButton = ({ onClick, disabled = false }: { onClick: () => void, disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
    aria-label="Open number pad"
  >
    <Calculator size={16} />
  </button>
);

// --- Floating Inspector Component ---
interface FloatingInspectorProps {
  item: TreatmentPlanItem;
  phase: TreatmentPhase | null;
  position: { top: number; left: number };
  onSave: (updatedItem: TreatmentPlanItem) => void;
  onClose: () => void;
  onDeleteItem: (itemId: string) => void;
}

const FloatingInspector = React.forwardRef<HTMLDivElement, FloatingInspectorProps>(({
  item, phase, position, onSave, onClose, onDeleteItem
}, ref) => {
  const [editedItem, setEditedItem] = useState(item);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);

  useEffect(() => {
    setEditedItem(item);
  }, [item]);

  const handleChange = (field: keyof TreatmentPlanItem, value: any) => {
    setEditedItem(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNumericChange = (field: keyof TreatmentPlanItem, value: string, isInteger = true, min = 0) => {
    if (value === '') {
      handleChange(field, null);
      return;
    }
    const numericValue = isInteger ? parseInt(value, 10) : parseFloat(value);
    handleChange(field, isNaN(numericValue) ? min : Math.max(min, numericValue));
  };
  
  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <>
      <div
        ref={ref}
        className="absolute z-50 w-[300px] rounded-xl border border-white/40 bg-white/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md animate-in fade-in-20 zoom-in-90"
        style={{ top: position.top, left: position.left }}
        onClick={e => e.stopPropagation()}
      >
        <div className="pb-3 border-b border-gray-200/60">
          <input
            value={editedItem.procedureName}
            onChange={e => handleChange('procedureName', e.target.value)}
            className="w-full bg-transparent font-semibold text-gray-900 outline-none text-base"
          />
          <p className="text-xs text-gray-500 font-mono mt-1">{editedItem.procedureCode}</p>
        </div>
        <div className="py-3 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between"><span>Phase:</span><span className="font-semibold text-gray-800">{phase?.title || 'Unassigned'}</span></div>
          <div className="flex justify-between"><span>Total Fee:</span><span className="font-semibold text-gray-800">${editedItem.netFee.toLocaleString('en-US')}</span></div>
        </div>
        <div className="py-3 border-t border-gray-200/60 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Urgency</label>
            <select value={editedItem.urgency ?? 'ELECTIVE'} onChange={e => handleChange('urgency', e.target.value as UrgencyLevel)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm">
                <option value="ELECTIVE">Elective</option>
                <option value="SOON">Soon</option>
                <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Est. Duration</label>
            <div className="flex gap-1.5">
              <div className="flex items-center gap-1.5 flex-grow">
                <input type="number" value={editedItem.estimatedDurationValue ?? ''} onChange={e => handleNumericChange('estimatedDurationValue', e.target.value, true, 0)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm" />
                <NumpadButton onClick={() => setIsNumpadOpen(true)} />
              </div>
              <select value={editedItem.estimatedDurationUnit ?? 'weeks'} onChange={e => handleChange('estimatedDurationUnit', e.target.value as any)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm">
                <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <textarea className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm" rows={2} placeholder="Add clinical notes..." value={editedItem.notes ?? ''} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </div>
        <div className="pt-3 mt-1 border-t border-gray-200/60 flex justify-between items-center">
          <button onClick={() => onDeleteItem(item.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Delete</button>
          <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </div>
      <NumberPadModal
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        onDone={(newValue) => {
            handleNumericChange('estimatedDurationValue', newValue, true, 0);
            setIsNumpadOpen(false);
        }}
        initialValue={String(editedItem.estimatedDurationValue ?? '')}
        title="Est. Duration"
        isPercentage={false}
      />
    </>
  );
});


// --- Helper Functions ---
const getAggregatedPhaseDuration = (phaseItems: TreatmentPlanItem[]): string | null => {
    if (phaseItems.length === 0) return null;
    const convertToDays = (value: number, unit: 'days' | 'weeks' | 'months'): number => {
        switch(unit) {
            case 'days': return value; case 'weeks': return value * 7; case 'months': return value * 30.44;
        }
    }
    let totalDays = 0, hasMonths = false, hasWeeks = false, hasItemsWithDuration = false;
    for (const item of phaseItems) {
        if (item.estimatedDurationValue && item.estimatedDurationUnit) {
            hasItemsWithDuration = true;
            totalDays += convertToDays(item.estimatedDurationValue, item.estimatedDurationUnit);
            if (item.estimatedDurationUnit === 'months') hasMonths = true;
            if (item.estimatedDurationUnit === 'weeks') hasWeeks = true;
        }
    }
    if (!hasItemsWithDuration || totalDays <= 0) return null;
    let finalValue: number, finalUnit: string;
    if (hasMonths || totalDays >= 30) {
        finalValue = Math.round(totalDays / 30.44); finalUnit = `mo${finalValue !== 1 ? 's' : ''}`;
    } else if (hasWeeks || totalDays >= 7) {
        finalValue = Math.round(totalDays / 7); finalUnit = `wk${finalValue !== 1 ? 's' : ''}`;
    } else {
        finalValue = Math.round(totalDays); finalUnit = `day${finalValue !== 1 ? 's' : ''}`;
    }
    if (finalValue < 1) finalValue = 1;
    return `Est. ${finalValue} ${finalUnit}`;
}

const getUrgencyColor = (urgency?: UrgencyLevel) => {
    switch (urgency) {
        case 'URGENT': return 'bg-red-400';
        case 'SOON': return 'bg-orange-400';
        case 'ELECTIVE': return 'bg-blue-500';
        default: return 'bg-gray-400';
    }
};

const generateId = () => `id-${Math.random().toString(36).substring(2, 10)}`;

// --- Main Board Component ---
interface TreatmentPlanBoardModalProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onClose: () => void;
  onSaveChanges: (plan: TreatmentPlan, items: TreatmentPlanItem[]) => void;
}

export const TreatmentPlanBoardModal: React.FC<TreatmentPlanBoardModalProps> = ({ plan, items, onClose, onSaveChanges }) => {
  const [localPlan, setLocalPlan] = useState<TreatmentPlan>(plan);
  const [localItems, setLocalItems] = useState<TreatmentPlanItem[]>(items);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<{ top: number; left: number } | null>(null);
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const { phases, itemsByPhase, itemPhaseMap } = useMemo(() => {
    const sortedPhases = (localPlan.phases || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const itemMapById = new Map(localItems.map(i => [i.id, i]));
    const itemsByPhaseMap: Record<string, TreatmentPlanItem[]> = {};
    const itemPhaseMap = new Map<string, TreatmentPhase>();
    for (const phase of sortedPhases) {
        itemsByPhaseMap[phase.id] = phase.itemIds
            .map(id => { const item = itemMapById.get(id); if(item) itemPhaseMap.set(id, phase); return item; })
            .filter((item): item is TreatmentPlanItem => !!item);
    }
    const allAssignedItemIds = new Set(sortedPhases.flatMap(p => p.itemIds));
    const unassignedItems = localItems.filter(i => !allAssignedItemIds.has(i.id) && i.phaseId);
    unassignedItems.forEach(item => {
        const phase = sortedPhases.find(p => p.id === item.phaseId);
        if (phase && itemsByPhaseMap[phase.id] && !itemsByPhaseMap[phase.id].find(i => i.id === item.id)) {
            itemsByPhaseMap[phase.id].push(item);
            itemPhaseMap.set(item.id, phase);
        }
    });
    return { phases: sortedPhases, itemsByPhase: itemsByPhaseMap, itemPhaseMap };
  }, [localPlan.phases, localItems]);
  
  const selectedItem = useMemo(() => localItems.find(i => i.id === selectedItemId) || null, [localItems, selectedItemId]);

  const closeInspector = useCallback(() => setSelectedItemId(null), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (e.key === 'Escape') && closeInspector();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInspector]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', itemId); setDraggingItemId(itemId); };
  const handleDragEnd = () => { setDraggingItemId(null); setDragOverPhaseId(null); setDragOverItemId(null); };
  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => { e.preventDefault(); setDragOverPhaseId(phaseId); setDragOverItemId(null); };
  const handleItemDragOver = (e: React.DragEvent, phaseId: string, targetItemId: string) => { e.preventDefault(); e.stopPropagation(); if (draggingItemId !== targetItemId) { setDragOverPhaseId(phaseId); setDragOverItemId(targetItemId); } };
  
  const handleDrop = (e: React.DragEvent, phaseId: string, targetItemId?: string) => {
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetItemId) { handleDragEnd(); return; }

    setLocalPlan(prevPlan => {
        const newPhases = [...(prevPlan.phases || [])];
        const sourcePhase = newPhases.find(p => p.itemIds.includes(draggedId));
        const targetPhase = newPhases.find(p => p.id === phaseId)!;
        
        if (sourcePhase) sourcePhase.itemIds = sourcePhase.itemIds.filter(id => id !== draggedId);
        
        const targetItems = [...targetPhase.itemIds];
        const toIndex = targetItemId ? targetItems.indexOf(targetItemId) : targetItems.length;
        targetItems.splice(toIndex, 0, draggedId);
        targetPhase.itemIds = targetItems;

        return { ...prevPlan, phases: newPhases };
    });
    setLocalItems(prevItems => prevItems.map(item => item.id === draggedId ? { ...item, phaseId } : item));
    handleDragEnd();
  };

  const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
    setLocalItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    closeInspector();
  };

  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = localItems.find(i => i.id === itemId);
    if (!itemToDelete) return;
    setLocalItems(prev => prev.filter(i => i.id !== itemId));
    setLocalPlan(prev => ({
        ...prev,
        itemIds: prev.itemIds.filter(id => id !== itemId),
        phases: prev.phases?.map(p => ({ ...p, itemIds: p.itemIds.filter(id => id !== itemId) }))
    }));
    closeInspector();
  };

  const handleAddPhase = () => {
    if ((localPlan.phases?.length ?? 0) >= 8) return;
    const newPhase: TreatmentPhase = {
        id: generateId(),
        planId: localPlan.id,
        bucketKey: 'OTHER',
        title: 'New Phase',
        sortOrder: localPlan.phases?.length ?? 0,
        itemIds: [],
        isMonitorPhase: false,
    };
    setLocalPlan(prev => ({ ...prev, phases: [...(prev.phases || []), newPhase] }));
  };

  const handleUpdatePhase = (phaseId: string, updates: Partial<TreatmentPhase>) => {
    setLocalPlan(prev => ({ ...prev, phases: prev.phases?.map(p => p.id === phaseId ? { ...p, ...updates } : p) }));
  };

  const handleDeletePhase = (phaseIdToDelete: string) => {
    const phaseToDelete = localPlan.phases?.find(p => p.id === phaseIdToDelete);
    if (!phaseToDelete) return;
    
    if (localPlan.phases && localPlan.phases.length === 1 && phaseToDelete.itemIds.length > 0) {
        alert("Cannot delete the last phase if it contains procedures.");
        setDeletingPhaseId(null);
        return;
    }

    setLocalPlan(prevPlan => {
        if (!prevPlan.phases) return prevPlan;
        const itemsToMove = phaseToDelete.itemIds;
        const newPhases = prevPlan.phases.filter(p => p.id !== phaseIdToDelete);
        
        if (itemsToMove.length > 0) {
            let fallbackPhase = newPhases.find(p => p.bucketKey === 'OTHER') || newPhases[0];
            if (fallbackPhase) {
                fallbackPhase.itemIds = [...fallbackPhase.itemIds, ...itemsToMove];
                setLocalItems(prevItems => 
                    prevItems.map(item => 
                        itemsToMove.includes(item.id) 
                            ? { ...item, phaseId: fallbackPhase!.id } 
                            : item
                    )
                );
            } else {
                setLocalItems(prevItems => 
                    prevItems.map(item => 
                        itemsToMove.includes(item.id) 
                            ? { ...item, phaseId: null } 
                            : item
                    )
                );
            }
        }
        return { ...prevPlan, phases: newPhases };
    });
    setDeletingPhaseId(null);
  };

  const handleSaveAndClose = () => {
    onSaveChanges(localPlan, localItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" aria-modal="true" role="dialog">
      <div className="bg-white w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <main ref={boardRef} className="flex-1 overflow-auto p-5 flex flex-col bg-gradient-to-r from-slate-100/50 via-white to-white relative">
          <div className="flex gap-4">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex-1 min-w-[280px] flex flex-col group">
                  <div className="relative h-8 flex justify-center items-center">
                    {index > 0 && <div className="absolute right-1/2 w-1/2 h-px bg-gray-300" />}
                    {index < phases.length - 1 && <div className="absolute left-1/2 w-1/2 h-px bg-gray-300" />}
                    <div className="relative w-5 h-5 rounded-full flex items-center justify-center bg-slate-50 border-2 border-gray-200">
                      {index === 0 ? <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>
                  </div>
                  <div className={`mb-3 px-1 relative text-center`}>
                    <div className="text-sm font-semibold text-gray-900 truncate flex items-center justify-center gap-1">
                        <select value={phase.title} onChange={e => handleUpdatePhase(phase.id, { title: e.target.value })} className="w-full text-center font-semibold bg-transparent border-none outline-none focus:ring-0 appearance-none">
                            <option value={phase.title}>{`Phase ${index + 1} — ${phase.title}`}</option>
                            {PHASE_PRESETS.map(p => <option key={p} value={p}>{`Phase ${index + 1} — ${p}`}</option>)}
                        </select>
                        {deletingPhaseId === phase.id ? (
                          <div className="flex items-center gap-1.5 ml-1 animate-in fade-in">
                            <span className="text-xs font-bold text-red-600">Delete?</span>
                            <button onClick={() => handleDeletePhase(phase.id)} className="px-2 py-0.5 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Yes</button>
                            <button onClick={() => setDeletingPhaseId(null)} className="px-2 py-0.5 text-xs text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingPhaseId(phase.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={13} />
                          </button>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{itemsByPhase[phase.id]?.length || 0} procedure{itemsByPhase[phase.id]?.length !== 1 ? 's' : ''}</div>
                    {getAggregatedPhaseDuration(itemsByPhase[phase.id] || []) && <div className="text-xs text-gray-600 mt-1 font-medium">{getAggregatedPhaseDuration(itemsByPhase[phase.id] || [])}</div>}
                    <div className="mt-2 text-xs"><label className="flex items-center justify-center gap-1.5 text-gray-500"><input type="checkbox" checked={!!phase.isMonitorPhase} onChange={e => handleUpdatePhase(phase.id, { isMonitorPhase: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" /> Monitor Phase</label></div>
                    {index < phases.length - 1 && <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><ArrowRight size={16} /></div>}
                  </div>
                </div>
              ))}
          </div>
          <div className="flex gap-4 flex-1 min-h-0">
            {phases.map(phase => (
              <div key={phase.id} className={`flex-1 min-w-[280px] rounded-2xl border p-3 flex flex-col transition-colors bg-slate-50 shadow-sm ${dragOverPhaseId === phase.id && !dragOverItemId ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`} onDragOver={e => handlePhaseDragOver(e, phase.id)} onDrop={e => handleDrop(e, phase.id)}>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 -mr-2 flex-1 relative">
                  {(itemsByPhase[phase.id] || []).map(item => (
                    <div key={item.id} className="relative z-10" onDragOver={e => handleItemDragOver(e, phase.id, item.id)} onDrop={e => handleDrop(e, phase.id, item.id)}>
                      <div ref={el => { if (el) cardRefs.current.set(item.id, el); else cardRefs.current.delete(item.id); }} draggable onClick={() => setSelectedItemId(item.id)} onDragStart={e => handleDragStart(e, item.id)} onDragEnd={handleDragEnd} className={`rounded-xl border shadow-sm cursor-pointer transition-all duration-150 flex overflow-hidden ${draggingItemId === item.id ? 'opacity-40' : ''} ${dragOverItemId === item.id ? 'ring-2 ring-blue-400 bg-white' : 'hover:shadow-md border-gray-200 bg-white'} ${selectedItemId === item.id ? 'ring-2 ring-blue-500 border-blue-400 bg-white' : ''}`}>
                        <div className={`w-1.5 shrink-0 ${getUrgencyColor(item.urgency)}`} />
                        <div className="p-2 flex-1">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 cursor-grab mt-0.5 shrink-0" aria-hidden="true"><GripVertical size={12} /></div>
                            <div className="flex-1">
                              <span className="font-medium text-xs leading-tight text-gray-800">{item.procedureName}</span>
                              <div className="flex justify-between items-end mt-2"><div className="font-bold text-base text-gray-900">${item.netFee?.toFixed(0) ?? '—'}</div></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedItem && ( <FloatingInspector ref={inspectorRef} item={selectedItem} phase={itemPhaseMap.get(selectedItem.id) || null} onSave={handleUpdateItem} onClose={closeInspector} position={inspectorPosition || {top: 100, left: 100}} onDeleteItem={handleDeleteItem} /> )}
        </main>
        <footer className="shrink-0 px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <button onClick={handleAddPhase} disabled={(localPlan.phases?.length ?? 0) >= 8} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={14}/> Add Phase</button>
            <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveAndClose} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
        </footer>
      </div>
    </div>
  );
};
