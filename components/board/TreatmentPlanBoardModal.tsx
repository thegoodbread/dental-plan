
import React, { useMemo, useState, useCallback } from 'react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase, UrgencyLevel, FeeCategory } from '../../types';
import { Plus, X, MoreHorizontal, Clock, GripVertical, Edit, Trash2, Library } from 'lucide-react';
import { SEDATION_TYPES, checkAddOnCompatibility, createAddOnItem, ADD_ON_LIBRARY, AddOnDefinition } from '../../services/treatmentPlans';
import { AddOnsLibraryPanel } from './AddOnsLibraryPanel';

const generateId = () => `id-${Math.random().toString(36).substring(2, 10)}`;
const PRESET_PHASE_TITLES = ["Monitor Phase", "Foundation & Diagnostics", "Restorative", "Implant & Surgical", "Elective / Cosmetic", "Additional Treatment"];

// --- Helper Functions ---
const getCategoryClass = (category: FeeCategory) => {
    switch (category) {
        case 'DIAGNOSTIC': return 'border-l-sky-500';
        case 'PREVENTIVE': return 'border-l-cyan-500';
        case 'RESTORATIVE': return 'border-l-blue-600';
        case 'ENDODONTIC': return 'border-l-purple-500';
        case 'PERIO': return 'border-l-teal-500';
        case 'IMPLANT': return 'border-l-indigo-500';
        case 'PROSTHETIC': return 'border-l-rose-500';
        case 'ORTHO': return 'border-l-pink-500';
        case 'COSMETIC': return 'border-l-fuchsia-500';
        case 'OTHER': return 'border-l-slate-500';
        default: return 'border-l-gray-400';
    }
};

const estimateChairTime = (item: TreatmentPlanItem): number => {
    if (item.itemType === 'ADDON') {
        const name = item.procedureName.toLowerCase();
        if (name.includes('iv') || name.includes('oral')) return 60;
        return 30;
    }

    if (item.procedureName.toLowerCase().includes('crown') || item.procedureName.toLowerCase().includes('bridge')) return 90;
    if (item.category === 'IMPLANT') return 120;
    if (item.category === 'ENDODONTIC') return 90;
    if (item.category === 'RESTORATIVE') return 60;
    if (item.category === 'PERIO') return 50;
    if (item.category === 'PROSTHETIC') return 60;
    return 30;
};

const formatMinutes = (totalMinutes: number): string => {
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const renderLocation = (item: TreatmentPlanItem): string | null => {
    if (item.itemType === 'ADDON') return item.addOnKind === 'SEDATION' ? 'Sedation' : 'Add-On';
    if (item.selectedTeeth && item.selectedTeeth.length > 0) return `#${item.selectedTeeth.join(', #')}`;
    if (item.selectedQuadrants && item.selectedQuadrants.length > 0) return `${item.selectedQuadrants.join(', ')}`;
    if (item.selectedArches && item.selectedArches.length > 0) return `${item.selectedArches.join(', ')}`;
    return null;
};

const formatPhaseDuration = (phase: TreatmentPhase): string | null => {
    const { estimatedDurationValue, estimatedDurationUnit } = phase;
    if (estimatedDurationValue && estimatedDurationUnit) {
        let unitAbbr = '';
        switch(estimatedDurationUnit) {
            case 'days': unitAbbr = estimatedDurationValue === 1 ? 'day' : 'days'; break;
            case 'weeks': unitAbbr = estimatedDurationValue === 1 ? 'wk' : 'wks'; break;
            case 'months': unitAbbr = estimatedDurationValue === 1 ? 'mo' : 'mos'; break;
            default: return null;
        }
        return `Est. ${estimatedDurationValue} ${unitAbbr}`;
    }
    return null;
};

const convertToDays = (value: number | null | undefined, unit: 'days' | 'weeks' | 'months' | null | undefined): number => {
    if (!value || !unit) return 0;
    switch(unit) {
        case 'days': return value;
        case 'weeks': return value * 7;
        case 'months': return value * 30.44; // More accurate average
    }
    return 0;
}

const recalculatePhaseDuration = (phase: TreatmentPhase, items: TreatmentPlanItem[]): { estimatedDurationValue: number | null; estimatedDurationUnit: 'days' | 'weeks' | 'months' | null } => {
    const itemMap = new Map(items.map(i => [i.id, i]));
    const phaseItems = phase.itemIds.map(id => itemMap.get(id)).filter(Boolean) as TreatmentPlanItem[];
    if (phaseItems.length === 0) {
        return { estimatedDurationValue: null, estimatedDurationUnit: null };
    }

    let totalDays = 0;
    let hasMonths = false;
    let hasWeeks = false;

    for (const item of phaseItems) {
        totalDays += convertToDays(item.estimatedDurationValue, item.estimatedDurationUnit);
        if (item.estimatedDurationUnit === 'months') hasMonths = true;
        if (item.estimatedDurationUnit === 'weeks') hasWeeks = true;
    }

    if (totalDays <= 0) {
        return { estimatedDurationValue: null, estimatedDurationUnit: null };
    }

    let finalValue: number;
    let finalUnit: 'days' | 'weeks' | 'months';

    if (hasMonths) {
        finalValue = Math.round(totalDays / 30.44);
        finalUnit = 'months';
    } else if (hasWeeks) {
        finalValue = Math.round(totalDays / 7);
        finalUnit = 'weeks';
    } else {
        finalValue = Math.round(totalDays);
        finalUnit = 'days';
    }

    if (finalValue < 1 && totalDays > 0) {
        finalValue = 1;
    }

    return { estimatedDurationValue: finalValue, estimatedDurationUnit: finalUnit };
};


// --- Sub-components for SaaS UI ---

const IosSwitch = ({ checked, onChange, id }: { checked: boolean, onChange: () => void, id: string }) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);


const ProcedureEditorModal: React.FC<{
  item: TreatmentPlanItem,
  onSave: (updatedItem: TreatmentPlanItem) => void,
  onClose: () => void,
  onDeleteItem: (itemId: string) => void
}> = ({ item, onSave, onClose, onDeleteItem }) => {
  const [editedItem, setEditedItem] = useState(item);

  const handleChange = (field: keyof TreatmentPlanItem, value: any) => {
    setEditedItem(prev => ({ ...prev, [field]: value }));
  };

  const handleSedationTypeChange = (newType: string) => {
    const def = SEDATION_TYPES.find(t => t.label === newType);
    setEditedItem(prev => ({
        ...prev,
        sedationType: newType,
        procedureName: `Sedation – ${newType}`,
        baseFee: def ? def.defaultFee : prev.baseFee,
        grossFee: def ? def.defaultFee : prev.grossFee,
        netFee: def ? (Math.max(0, def.defaultFee - (prev.discount || 0))) : prev.netFee,
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg text-gray-900">{item.itemType === 'ADDON' ? 'Edit Add-On' : 'Edit Procedure'}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100"><X size={20}/></button>
        </header>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {item.itemType === 'ADDON' && item.addOnKind === 'SEDATION' ? (
              <div>
                <label className="text-xs font-semibold text-gray-500">Sedation Type</label>
                <select 
                    value={editedItem.sedationType ?? ''} 
                    onChange={e => handleSedationTypeChange(e.target.value)} 
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                    {SEDATION_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
          ) : (
             <>
                <div>
                    <label className="text-xs font-semibold text-gray-500">Name</label>
                    <input value={editedItem.procedureName} onChange={e => handleChange('procedureName', e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                {item.itemType !== 'ADDON' && (
                    <div>
                        <label className="text-xs font-semibold text-gray-500">Urgency</label>
                        <select value={editedItem.urgency ?? 'ELECTIVE'} onChange={e => handleChange('urgency', e.target.value as UrgencyLevel)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm bg-white">
                            <option value="ELECTIVE">Elective</option>
                            <option value="SOON">Soon</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>
                )}
             </>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500">Clinical Notes</label>
            <textarea className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm min-h-[80px]" value={editedItem.notes ?? ''} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </div>
        <footer className="p-4 bg-gray-50 border-t flex justify-between items-center">
            <button onClick={() => onDeleteItem(item.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold px-3 py-2 rounded-lg hover:bg-red-50">{item.itemType === 'ADDON' ? 'Remove Add-On' : 'Delete Procedure'}</button>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSave(editedItem)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
        </footer>
      </div>
    </div>
  );
};


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
  const [dragOverProcedureId, setDragOverProcedureId] = useState<string | null>(null); // For dropping add-ons onto procedures
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Phase menu state
  const [openMenuPhaseId, setOpenMenuPhaseId] = useState<string | null>(null);
  const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  
  const selectedItem = useMemo(() => localItems.find(i => i.id === selectedItemId) || null, [localItems, selectedItemId]);
  const closeEditor = useCallback(() => setSelectedItemId(null), []);

  const { phases, itemsByPhase } = useMemo(() => {
    const sortedPhases = (localPlan.phases || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const itemMapById = new Map(localItems.map(i => [i.id, i]));
    const itemsByPhaseMap: Record<string, TreatmentPlanItem[]> = {};
    for (const phase of sortedPhases) {
        itemsByPhaseMap[phase.id] = phase.itemIds
            .map(id => itemMapById.get(id))
            .filter((item): item is TreatmentPlanItem => !!item);
    }
    return { phases: sortedPhases, itemsByPhase: itemsByPhaseMap };
  }, [localPlan.phases, localItems]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => { 
    e.dataTransfer.effectAllowed = 'move'; 
    e.dataTransfer.setData('text/plain', itemId); 
    setDraggingItemId(itemId); 
  };
  const handleDragEnd = () => { setDraggingItemId(null); setDragOverPhaseId(null); setDragOverProcedureId(null); };
  
  // Phase Drag Handlers
  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => { 
      // Only allow procedure drag over phases
      if (draggingItemId) {
        e.preventDefault(); 
        setDragOverPhaseId(phaseId);
      }
  };
  
  // Procedure Drag Handlers (For incoming Add-ons)
  const handleProcedureDragOver = (e: React.DragEvent, procedure: TreatmentPlanItem) => {
      // Check if we are dragging a template from library
      const isTemplate = e.dataTransfer.types.includes('application/json');
      if (isTemplate) {
          e.preventDefault();
          e.stopPropagation(); // Don't bubble to phase
          setDragOverProcedureId(procedure.id);
      }
  };
  
  const handleDropOnPhase = (e: React.DragEvent, phaseId: string) => {
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) { handleDragEnd(); return; }

    // Existing move logic for items between phases...
    // 1. Identify all items to move (Parent + Linked Add-ons)
    const linkedAddOnItems = localItems.filter(i => 
        i.itemType === 'ADDON' && i.linkedItemIds?.includes(draggedId)
    );
    const idsToMove = [draggedId, ...linkedAddOnItems.map(s => s.id)];

    // 2. Update Plan Phases
    setLocalPlan(prevPlan => {
        const newPhases = (prevPlan.phases || []).map(p => ({ ...p, itemIds: [...p.itemIds] }));
        const targetPhase = newPhases.find(p => p.id === phaseId);
        if (!targetPhase) return prevPlan;

        newPhases.forEach(p => {
             p.itemIds = p.itemIds.filter(id => !idsToMove.includes(id));
        });

        targetPhase.itemIds.push(...idsToMove);
        return { ...prevPlan, phases: newPhases };
    });

    // 3. Update Item properties
    setLocalItems(prevItems => prevItems.map(item => {
        if (idsToMove.includes(item.id)) {
            return { ...item, phaseId };
        }
        return item;
    }));
    
    handleDragEnd();
  };

  const handleDropOnProcedure = (e: React.DragEvent, targetProcedure: TreatmentPlanItem) => {
      e.preventDefault(); e.stopPropagation();
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return handleDragEnd();

      try {
          const data = JSON.parse(rawData);
          if (data.type === 'ADDON_TEMPLATE') {
              const definition = data as AddOnDefinition;
              
              // Check Compatibility
              if (!checkAddOnCompatibility(definition.kind, targetProcedure.category)) {
                  alert(`Cannot attach ${definition.label} to this procedure type.`);
                  handleDragEnd();
                  return;
              }

              // Create Item
              const newItem = createAddOnItem(localPlan.id, {
                  addOnKind: definition.kind,
                  label: definition.label,
                  fee: localPlan.feeScheduleType === 'membership' && definition.membershipFee ? definition.membershipFee : definition.defaultFee,
                  phaseId: targetProcedure.phaseId || '',
                  appliesToItemIds: [targetProcedure.id],
                  category: definition.category,
                  code: definition.defaultCode
              });

              // Add to local state
              setLocalItems(prev => [...prev, newItem]);
              
              // Update Plan phase
              setLocalPlan(prev => ({
                  ...prev,
                  itemIds: [...prev.itemIds, newItem.id],
                  phases: prev.phases?.map(p => p.id === newItem.phaseId ? { ...p, itemIds: [...p.itemIds, newItem.id] } : p)
              }));
          }
      } catch (err) {
          console.error("Drop error", err);
      }
      handleDragEnd();
  };

  const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
    setLocalItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    closeEditor();
  };

  const handleDeleteItem = (itemId: string) => {
    const toDelete = localItems.find(i => i.id === itemId);
    if (!toDelete) return;

    let updatedItems = localItems.filter(i => i.id !== itemId);
    
    // Simple cascade for visualization
    if (toDelete.itemType !== 'ADDON') {
        updatedItems = updatedItems.filter(i => !(i.itemType === 'ADDON' && i.linkedItemIds?.length === 1 && i.linkedItemIds[0] === itemId));
    }
    
    setLocalItems(updatedItems);
    setLocalPlan(prev => ({
        ...prev,
        itemIds: prev.itemIds.filter(id => id !== itemId), 
        phases: prev.phases?.map(p => ({ ...p, itemIds: p.itemIds.filter(id => id !== itemId) })) 
    }));
    closeEditor();
  };

  const handleAddPhase = () => {
    if ((localPlan.phases?.length ?? 0) >= 8) return;
    const newPhase: TreatmentPhase = {
        id: generateId(), planId: localPlan.id, bucketKey: 'OTHER', title: 'New Phase',
        sortOrder: localPlan.phases?.length ?? 0, itemIds: [], isMonitorPhase: false,
    };
    setLocalPlan(prev => ({ ...prev, phases: [...(prev.phases || []), newPhase] }));
  };

  const handleSaveAndClose = () => {
    onSaveChanges(localPlan, localItems);
    onClose();
  };
  
  const handleRenameStart = (phaseId: string, currentTitle: string) => {
    setRenamingPhaseId(phaseId);
    setRenameValue(currentTitle);
    setOpenMenuPhaseId(null);
  };

  const handleRenameSave = () => {
    if (!renamingPhaseId) return;
    setLocalPlan(prev => ({
        ...prev,
        phases: prev.phases?.map(p => p.id === renamingPhaseId ? { ...p, title: renameValue } : p)
    }));
    setRenamingPhaseId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingPhaseId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSave();
    if (e.key === 'Escape') handleRenameCancel();
  };

  const handleDeletePhase = (phaseId: string) => {
    const phaseToDelete = localPlan.phases?.find(p => p.id === phaseId);
    if (!phaseToDelete) return;

    const itemsInPhase = phaseToDelete.itemIds;
    if (itemsInPhase.length > 0) {
        if (!window.confirm(`Are you sure you want to delete this phase and its ${itemsInPhase.length} procedure(s)? This cannot be undone.`)) {
            setOpenMenuPhaseId(null);
            return;
        }
    }

    setLocalItems(prev => prev.filter(item => !itemsInPhase.includes(item.id)));
    
    setLocalPlan(prev => {
        const updatedPhases = prev.phases?.filter(p => p.id !== phaseId) ?? [];
        updatedPhases.forEach((p, index) => { p.sortOrder = index; });
        
        return {
            ...prev,
            phases: updatedPhases,
            itemIds: prev.itemIds.filter(id => !itemsInPhase.includes(id)),
        };
    });

    setOpenMenuPhaseId(null);
  };
  
  const handleToggleMonitorPhase = (phaseId: string) => {
    setLocalPlan(prev => ({
        ...prev,
        phases: prev.phases?.map(p => {
            if (p.id === phaseId) {
                const isNowMonitor = !p.isMonitorPhase;
                if (isNowMonitor) {
                    // Toggling ON: Set manual duration
                    return {
                        ...p,
                        isMonitorPhase: true,
                        estimatedDurationValue: 2, // Default monitor duration
                        estimatedDurationUnit: 'months',
                    };
                } else {
                    // Toggling OFF: Recalculate from items
                    const { estimatedDurationValue, estimatedDurationUnit } = recalculatePhaseDuration(p, localItems);
                    return {
                        ...p,
                        isMonitorPhase: false,
                        estimatedDurationValue,
                        estimatedDurationUnit,
                    };
                }
            }
            return p;
        })
    }));
  };

  const handleSetPhaseTitle = (phaseId: string, newTitle: string) => {
      setLocalPlan(prev => ({
          ...prev,
          phases: prev.phases?.map(p => p.id === phaseId ? { ...p, title: newTitle } : p)
      }));
      setOpenMenuPhaseId(null);
  };

  const handleUpdatePhaseDuration = (phaseId: string, field: 'value' | 'unit', value: string) => {
      setLocalPlan(prev => ({
          ...prev,
          phases: prev.phases?.map(p => {
              if (p.id === phaseId) {
                  if (field === 'value') {
                      return { ...p, estimatedDurationValue: parseInt(value, 10) || null };
                  }
                  if (field === 'unit') {
                      return { ...p, estimatedDurationUnit: value as 'days' | 'weeks' | 'months' };
                  }
              }
              return p;
          })
      }));
  };
  
  const handleOpenLibrary = () => {
      setIsLibraryOpen(true);
  };

  const totalChairTime = useMemo(() => localItems.reduce((sum, item) => sum + estimateChairTime(item), 0), [localItems]);
  const maxPhases = 8;

  const TimelineIndicator = () => (
    <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-around px-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={`w-1.5 h-1.5 rounded-full ${i < phases.length - 1 ? 'bg-slate-400' : 'bg-slate-300'}`} />
          {i < 6 && <div className="flex-1 h-px bg-slate-300" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpenMenuPhaseId(null)} aria-modal="true" role="dialog">
        <div className="bg-slate-50 w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 relative">
          
          <header className="shrink-0 px-5 py-3 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Treatment Plan Board</h2>
              <p className="text-xs text-gray-500">{localPlan.caseAlias} - {localPlan.planNumber}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
                <button 
                  onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${isLibraryOpen ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                    <Library size={16} /> Add-Ons Library
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <div className="text-right"><div className="text-gray-500 uppercase font-semibold">Production</div><div className="font-bold text-gray-900 text-sm">${localPlan.totalFee.toLocaleString()}</div></div>
                <div className="w-px h-6 bg-gray-200" />
                <div className="text-right"><div className="text-gray-500 uppercase font-semibold">Pt. Portion</div><div className="font-bold text-blue-600 text-sm">${localPlan.patientPortion.toLocaleString()}</div></div>
                <div className="w-px h-6 bg-gray-200" />
                <div className="text-right"><div className="text-gray-500 uppercase font-semibold">Chair Time</div><div className="font-bold text-gray-900 text-sm">{formatMinutes(totalChairTime)}</div></div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative flex">
             <div className="flex-1 flex flex-col relative pt-8">
                <TimelineIndicator />
                <div className="h-full grid grid-cols-4 grid-rows-2">
                {Array.from({ length: maxPhases }).map((_, index) => {
                    const phase = phases[index];
                    const isTopRow = index < 4;

                    if (phase) {
                    const phaseItems = itemsByPhase[phase.id] || [];
                    const procedureItems = phaseItems.filter(i => i.itemType !== 'ADDON');
                    const addOnItems = phaseItems.filter(i => i.itemType === 'ADDON');
                    
                    const durationText = formatPhaseDuration(phase);
                    return (
                        <div key={phase.id} className={`flex flex-col min-h-0 border-r border-slate-200 ${isTopRow ? 'border-b' : ''} ${isTopRow ? 'bg-slate-100/30' : 'bg-white'}`} onDragOver={e => handlePhaseDragOver(e, phase.id)} onDrop={e => handleDropOnPhase(e, phase.id)}>
                        <div className="p-3 border-b border-slate-200 shrink-0 relative">
                            <div className="flex justify-between items-center">
                                {renamingPhaseId === phase.id ? (
                                    <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onBlur={handleRenameSave}
                                        onKeyDown={handleRenameKeyDown}
                                        className="font-semibold text-gray-800 truncate text-sm bg-white border border-blue-400 rounded-md px-2 py-0.5 w-full mr-2"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <h3 className="font-semibold text-gray-800 truncate text-sm">{`Phase ${index + 1} — ${phase.title}`}</h3>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuPhaseId(phase.id === openMenuPhaseId ? null : phase.id); }} className={`p-1 rounded transition-colors ${openMenuPhaseId === phase.id ? 'bg-slate-200 text-gray-800 ring-2 ring-blue-400' : 'text-gray-400 hover:text-gray-600 hover:bg-slate-100'}`}><MoreHorizontal size={16}/></button>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                            <span>{procedureItems.length} procedure{procedureItems.length !== 1 ? 's' : ''}</span>
                            {durationText && <span className="font-semibold">{durationText}</span>}
                            </div>
                            {openMenuPhaseId === phase.id && (
                                <div className="absolute top-11 right-2 z-30 w-48 bg-white rounded-lg shadow-lg border border-gray-200 text-sm" onClick={e => e.stopPropagation()}>
                                    <div className="p-2">
                                    <div className="px-1 py-1.5 flex justify-between items-center">
                                        <label htmlFor={`monitor-switch-${phase.id}`} className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Monitor Phase</label>
                                        <IosSwitch id={`monitor-switch-${phase.id}`} checked={!!phase.isMonitorPhase} onChange={() => handleToggleMonitorPhase(phase.id)} />
                                    </div>
                                    </div>
                                    <div className="border-t my-1"></div>
                                    <div className="text-xs font-semibold text-gray-500 px-3 pt-1 pb-1">Set Title To...</div>
                                    <ul className="py-1">
                                    {PRESET_PHASE_TITLES.map(title => (
                                        <li key={title}><button onClick={() => handleSetPhaseTitle(phase.id, title)} className="w-full text-left px-3 py-1.5 text-gray-800 hover:bg-gray-100 truncate">{title}</button></li>
                                    ))}
                                    </ul>
                                    <div className="border-t my-1"></div>
                                    <ul className="py-1">
                                        <li><button onClick={() => handleRenameStart(phase.id, phase.title)} className="w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 flex items-center gap-2"><Edit size={14}/> Rename...</button></li>
                                        <li><button onClick={() => handleDeletePhase(phase.id)} className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Delete Phase</button></li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {phase.isMonitorPhase && (
                            <div className="p-2 bg-slate-200/50 border-b border-slate-200 shrink-0">
                                <label className="text-xs font-semibold text-gray-600">Monitoring Duration</label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        type="number"
                                        value={phase.estimatedDurationValue ?? ''}
                                        onChange={e => handleUpdatePhaseDuration(phase.id, 'value', e.target.value)}
                                        className="w-full p-1 border border-gray-300 rounded-md text-sm text-center bg-white text-gray-900"
                                    />
                                    <select
                                        value={phase.estimatedDurationUnit ?? 'months'}
                                        onChange={e => handleUpdatePhaseDuration(phase.id, 'unit', e.target.value)}
                                        className="w-full bg-white p-1 border border-gray-300 rounded-md text-sm text-gray-900"
                                    >
                                        <option value="days">Days</option>
                                        <option value="weeks">Weeks</option>
                                        <option value="months">Months</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className={`flex-1 p-2 space-y-1.5 overflow-y-auto transition-colors duration-300 ${dragOverPhaseId === phase.id ? 'bg-blue-100/50' : ''}`}>
                            {procedureItems.map(item => {
                                // Find attached add-ons for this item
                                const linkedAddOns = addOnItems.filter(s => s.linkedItemIds && s.linkedItemIds[0] === item.id);
                                const isTargeted = dragOverProcedureId === item.id;
                                
                                return (
                                    <React.Fragment key={item.id}>
                                        <div 
                                            draggable 
                                            onClick={() => setSelectedItemId(item.id)} 
                                            onDragStart={e => handleDragStart(e, item.id)} 
                                            onDragEnd={handleDragEnd} 
                                            onDragOver={e => handleProcedureDragOver(e, item)}
                                            onDrop={e => handleDropOnProcedure(e, item)}
                                            className={`p-2 rounded-md border bg-white shadow-sm cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all active:cursor-grabbing border-l-4 ${getCategoryClass(item.category)} ${draggingItemId === item.id ? 'opacity-30' : ''} ${isTargeted ? 'ring-2 ring-blue-500 border-blue-500 shadow-xl' : ''}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-semibold text-gray-800 leading-snug flex-1">{item.procedureName}</p>
                                                <div className="font-bold text-gray-900 text-xs ml-2">${item.netFee?.toFixed(0)}</div>
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                                <span>{renderLocation(item) || item.procedureCode}</span>
                                                <div className="flex items-center gap-1">
                                                    {!isLibraryOpen && <button 
                                                        onClick={(e) => { e.stopPropagation(); setIsLibraryOpen(true); }}
                                                        className="hover:text-blue-600 hover:bg-blue-50 rounded p-0.5 -mr-1" title="Add Add-On"
                                                    >
                                                        <Plus size={12} />
                                                    </button>}
                                                    <span className="font-semibold uppercase">{item.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Nested Add-On Cards */}
                                        {linkedAddOns.map(addon => (
                                            <div key={addon.id} onClick={() => setSelectedItemId(addon.id)} className={`ml-4 mr-1 p-2 rounded-md border bg-slate-50 border-gray-200 cursor-pointer hover:border-blue-300 relative before:content-[''] before:absolute before:left-[-12px] before:top-[-10px] before:w-[10px] before:h-[24px] before:border-l before:border-b before:border-gray-300 before:rounded-bl-md transition-opacity duration-300 ${draggingItemId === item.id ? 'opacity-30' : ''}`}>
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-medium text-gray-600 leading-snug flex-1">{addon.procedureName}</p>
                                                    <div className="font-bold text-gray-500 text-xs ml-2">${addon.netFee?.toFixed(0)}</div>
                                                </div>
                                                <div className="text-[9px] text-gray-400 mt-0.5 italic flex justify-between">
                                                    <span>{addon.addOnKind === 'SEDATION' ? 'Sedation' : 'Add-On'}</span>
                                                    {addon.procedureCode && <span className="font-mono">{addon.procedureCode}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        </div>
                    );
                    }
                    
                    const isNextSlot = index === phases.length;
                    return (
                        <div key={`empty-${index}`} className={`flex flex-col min-h-0 p-2 border-r border-slate-200 ${isTopRow ? 'border-b' : ''} ${isTopRow ? 'bg-slate-100/30' : 'bg-white'}`}>
                            {isNextSlot ? (
                                <button onClick={handleAddPhase} className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-200/40 hover:text-slate-600 rounded-lg transition-colors border-2 border-dashed border-slate-300/70">
                                    <Plus size={16}/>
                                    <span className="text-xs font-semibold">Add Phase</span>
                                </button>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-xs font-semibold text-slate-400/50">Phase {index + 1}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
             </div>

             {/* Add-Ons Library Panel */}
             {isLibraryOpen && (
                 <AddOnsLibraryPanel 
                    onClose={() => setIsLibraryOpen(false)}
                    feeScheduleType={localPlan.feeScheduleType}
                 />
             )}
          </div>
          
          <footer className="shrink-0 px-4 py-3 border-t bg-white flex items-center justify-between z-20">
              <div className="text-xs text-gray-500">{phases.length} of {maxPhases} phases used.</div>
              <div className="flex items-center gap-2">
                  <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveAndClose} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
          </footer>
        </div>
      </div>
      {selectedItem && (
        <ProcedureEditorModal item={selectedItem} onSave={handleUpdateItem} onClose={closeEditor} onDeleteItem={handleDeleteItem} />
      )}
    </>
  );
};