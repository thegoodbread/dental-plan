
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase, UrgencyLevel, FeeCategory, AddOnKind, Visit, VisitType, Provider, PHASE_BUCKET_LABELS } from '../../types';
import { Plus, X, MoreHorizontal, Clock, GripVertical, Edit, Trash2, Library, Calendar, Check, Stethoscope, History as HistoryIcon, ArrowRight, Eye, EyeOff, RotateCcw, Shuffle } from 'lucide-react';
import { SEDATION_TYPES, checkAddOnCompatibility, createAddOnItem, ADD_ON_LIBRARY, AddOnDefinition, createVisit, getVisitsForPlan, linkProceduresToVisit, getTreatmentPlanById, getProviders, getProviderById, getPhaseIdForItem, updateTreatmentPlanItem } from '../../services/treatmentPlans';
import { AddOnsLibraryPanel } from './AddOnsLibraryPanel';
import { VisitDetailModal } from './VisitDetailModal';

const generateId = () => `id-${Math.random().toString(36).substring(2, 10)}`;

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

const recalculatePhaseDuration = (items: TreatmentPlanItem[]): { estimatedDurationValue: number | null; estimatedDurationUnit: 'days' | 'weeks' | 'months' | null } => {
    if (items.length === 0) {
        return { estimatedDurationValue: null, estimatedDurationUnit: null };
    }

    let totalDays = 0;
    let hasMonths = false;
    let hasWeeks = false;

    for (const item of items) {
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

// --- Visit Creation Modal ---
const VisitCreationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (date: string, providerId: string, type: VisitType) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [providerId, setProviderId] = useState('');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [type, setType] = useState<VisitType>('restorative');

    useEffect(() => {
        if (isOpen) {
            const list = getProviders();
            setProviders(list);
            if (list.length > 0) setProviderId(list[0].id);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!providerId) {
            alert('Please select a provider');
            return;
        }
        onCreate(date, providerId, type);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Start New Visit</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
                        <select value={providerId} onChange={e => setProviderId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.fullName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visit Type</label>
                        <select value={type} onChange={e => setType(e.target.value as VisitType)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                            <option value="exam">Exam</option>
                            <option value="restorative">Restorative</option>
                            <option value="hygiene">Hygiene</option>
                            <option value="surgery">Surgery</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Start Visit</button>
                </div>
            </div>
        </div>
    );
};

// --- Existing Visits Modal ---
const ExistingVisitsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    visits: Visit[];
    onOpenDetail: (visit: Visit) => void;
}> = ({ isOpen, onClose, visits, onOpenDetail }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Existing Visits</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {visits.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-3 bg-slate-100 rounded-full mb-3 text-slate-400">
                                <HistoryIcon size={24} />
                            </div>
                            <p className="text-gray-900 font-medium">No visits recorded</p>
                            <p className="text-gray-500 text-sm mt-1">Start a new visit to track completed procedures.</p>
                        </div>
                    ) : (
                        visits.map(visit => (
                            <button 
                                key={visit.id} 
                                onClick={() => onOpenDetail(visit)}
                                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2 group-hover:text-blue-700">
                                            {new Date(visit.date).toLocaleDateString()}
                                            <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase group-hover:bg-white">{visit.visitType}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">{visit.provider}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {visit.status === 'COMPLETED' && <Check size={14} className="text-green-500" />}
                                        <div className="text-xs font-semibold bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:border-blue-200">
                                            {visit.attachedProcedureIds.length} proc
                                        </div>
                                        <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
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

// VISIT MODE STATE
interface ActiveVisitState {
    visit: Visit;
    selectedProcedureIds: string[];
}

export const TreatmentPlanBoardModal: React.FC<TreatmentPlanBoardModalProps> = ({ plan, items, onClose, onSaveChanges }) => {
  const [localPlan, setLocalPlan] = useState<TreatmentPlan>(plan);
  const [localItems, setLocalItems] = useState<TreatmentPlanItem[]>(items);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [draggingAddOnKind, setDraggingAddOnKind] = useState<AddOnKind | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [dragOverProcedureId, setDragOverProcedureId] = useState<string | null>(null); // For dropping add-ons onto procedures
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showEmptyBuckets, setShowEmptyBuckets] = useState(true);
  
  // Phase menu state
  const [openMenuPhaseId, setOpenMenuPhaseId] = useState<string | null>(null);
  const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // VISIT MODE STATE
  const [activeVisitState, setActiveVisitState] = useState<ActiveVisitState | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showExistingVisitsModal, setShowExistingVisitsModal] = useState(false);
  const [activeDetailVisit, setActiveDetailVisit] = useState<Visit | null>(null);
  const [existingVisits, setExistingVisits] = useState<Visit[]>([]);

  const loadVisits = useCallback(() => {
      setExistingVisits(getVisitsForPlan(plan.id));
  }, [plan.id]);

  useEffect(() => {
      loadVisits();
  }, [loadVisits]);

  const selectedItem = useMemo(() => localItems.find(i => i.id === selectedItemId) || null, [localItems, selectedItemId]);
  const closeEditor = useCallback(() => setSelectedItemId(null), []);

  const { phases, itemsByPhase } = useMemo(() => {
    let allPhases = (localPlan.phases || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    
    // Group items by their actual phaseId property (Source of Truth)
    const itemsByPhaseMap: Record<string, TreatmentPlanItem[]> = {};
    allPhases.forEach(p => itemsByPhaseMap[p.id] = []);

    localItems.forEach(item => {
        if (item.phaseId && itemsByPhaseMap[item.phaseId]) {
            itemsByPhaseMap[item.phaseId].push(item);
        }
    });

    // Sort items within phases
    Object.values(itemsByPhaseMap).forEach(list => {
        list.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    // We do NOT filter allPhases based on showEmptyBuckets here anymore.
    // The filtering/placeholder logic is handled in the Grid render loop (gridSlots).
    // This ensures stability of phase IDs.

    return { phases: allPhases, itemsByPhase: itemsByPhaseMap };
  }, [localPlan.phases, localItems]);

  const handleGlobalDragEnd = () => {
    setDraggingItemId(null);
    setDraggingAddOnKind(null);
    setDragOverPhaseId(null);
    setDragOverProcedureId(null);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => { 
    if (activeVisitState) { e.preventDefault(); return; } // Disable drag in visit mode
    e.dataTransfer.effectAllowed = 'move'; 
    e.dataTransfer.setData('text/plain', itemId); 
    setDraggingItemId(itemId); 
  };
  
  // Phase Drag Handlers
  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => { 
      if (activeVisitState) return;
      // Only allow procedure drag over phases (not add-ons from library)
      if (draggingItemId) {
        e.preventDefault(); 
        setDragOverPhaseId(phaseId);
      }
  };
  
  // Procedure Drag Handlers (For incoming Add-ons)
  const handleProcedureDragOver = (e: React.DragEvent, procedure: TreatmentPlanItem) => {
      if (activeVisitState) return;
      // 1. Check state-based tracking first (Library Drag)
      if (draggingAddOnKind) {
          if (checkAddOnCompatibility(draggingAddOnKind, procedure.category)) {
              e.preventDefault();
              e.stopPropagation();
              setDragOverProcedureId(procedure.id);
          }
          return;
      }
      
      // 2. Fallback for template checks (Safety)
      const isTemplate = e.dataTransfer.types.includes('application/json');
      if (isTemplate) {
          // If we somehow don't have state but it's JSON, allow it but we rely on check above mainly
          e.preventDefault();
          e.stopPropagation();
          setDragOverProcedureId(procedure.id);
      }
  };
  
  const handleProcedureDragLeave = (e: React.DragEvent, procedure: TreatmentPlanItem) => {
      // Prevent flickering when entering child elements (labels, prices)
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      
      if (dragOverProcedureId === procedure.id) {
          setDragOverProcedureId(null);
      }
  };
  
  const handleDropOnPhase = (e: React.DragEvent, phaseId: string) => {
    if (activeVisitState) return;
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) { handleGlobalDragEnd(); return; }

    // Existing move logic for items between phases...
    // 1. Identify all items to move (Parent + Linked Add-ons)
    const linkedAddOnItems = localItems.filter(i => 
        i.itemType === 'ADDON' && i.linkedItemIds?.includes(draggedId)
    );
    const idsToMove = [draggedId, ...linkedAddOnItems.map(s => s.id)];

    // 2. Update Items (Source of Truth)
    setLocalItems(prevItems => prevItems.map(item => {
        if (idsToMove.includes(item.id)) {
            // Lock the item to this phase so it doesn't float back
            return { ...item, phaseId, phaseLocked: true } as any; 
        }
        return item;
    }));
    
    // Note: We intentionally do NOT update localPlan.phases here because the UI is now derived from item.phaseId.
    // The manifest will be reconciled upon saving.
    
    handleGlobalDragEnd();
  };

  const handleResetToAuto = (e: React.MouseEvent, item: TreatmentPlanItem) => {
      e.stopPropagation();
      const autoPhaseId = getPhaseIdForItem(localPlan, item);
      if (!autoPhaseId) return; // fallback if somehow no phases

      // Update item state
      setLocalItems(prevItems => prevItems.map(i => {
          if (i.id === item.id) {
              return { ...i, phaseId: autoPhaseId, phaseLocked: false } as any;
          }
          return i;
      }));
  };

  const handleAutoOrganize = () => {
      if (!window.confirm("This will automatically move all UNLOCKED items to their recommended phases based on procedure type. Locked items will stay put. Continue?")) return;

      const updatedItems = localItems.map(item => {
          if (item.phaseLocked) return item;
          
          const autoPhaseId = getPhaseIdForItem(localPlan, item);
          if (autoPhaseId && autoPhaseId !== item.phaseId) {
              return { ...item, phaseId: autoPhaseId };
          }
          return item;
      });
      
      setLocalItems(updatedItems);
  };

  const handleDropOnProcedure = (e: React.DragEvent, targetProcedure: TreatmentPlanItem) => {
      if (activeVisitState) return;
      e.preventDefault(); e.stopPropagation();
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return handleGlobalDragEnd();

      try {
          const data = JSON.parse(rawData);
          if (data.type === 'ADDON_TEMPLATE') {
              const definition = data as AddOnDefinition;
              
              // Check Compatibility
              if (!checkAddOnCompatibility(definition.kind, targetProcedure.category)) {
                  alert(`Cannot attach ${definition.label} to this procedure type.`);
                  handleGlobalDragEnd();
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
              
              // No need to update plan manifest manually for UI update
          }
      } catch (err) {
          console.error("Drop error", err);
      }
      handleGlobalDragEnd();
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
    // No need to update plan manifest manually
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

    // Check items via itemsByPhase which is derived from item.phaseId
    const itemsInPhase = itemsByPhase[phaseId] || [];
    if (itemsInPhase.length > 0) {
        if (!window.confirm(`Are you sure you want to delete this phase and its ${itemsInPhase.length} procedure(s)? This cannot be undone.`)) {
            setOpenMenuPhaseId(null);
            return;
        }
    }

    // Filter items out
    setLocalItems(prev => prev.filter(item => item.phaseId !== phaseId));
    
    setLocalPlan(prev => {
        const updatedPhases = prev.phases?.filter(p => p.id !== phaseId) ?? [];
        updatedPhases.forEach((p, index) => { p.sortOrder = index; });
        return { ...prev, phases: updatedPhases };
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
                    const { estimatedDurationValue, estimatedDurationUnit } = recalculatePhaseDuration(itemsByPhase[phaseId] || []);
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
  
  // --- VISIT MODE HANDLERS ---

  const handleStartVisit = (date: string, providerId: string, type: VisitType) => {
      const provider = getProviderById(providerId);
      const newVisit = createVisit({
          treatmentPlanId: plan.id,
          date,
          providerId: providerId,
          provider: provider?.fullName || 'Unknown', // Legacy/Display
          visitType: type,
          attachedProcedureIds: []
      });
      
      setExistingVisits(prev => [...prev, newVisit]);
      setActiveVisitState({ visit: newVisit, selectedProcedureIds: [] });
      setShowVisitModal(false);
  };

  const handleToggleProcedureSelection = (procedureId: string) => {
      if (!activeVisitState) return;
      setActiveVisitState(prev => {
          if (!prev) return null;
          const isSelected = prev.selectedProcedureIds.includes(procedureId);
          return {
              ...prev,
              selectedProcedureIds: isSelected 
                  ? prev.selectedProcedureIds.filter(id => id !== procedureId)
                  : [...prev.selectedProcedureIds, procedureId]
          };
      });
  };

  const handleAttachToVisit = () => {
      if (!activeVisitState) return;
      if (activeVisitState.selectedProcedureIds.length === 0) {
          alert("Please select at least one procedure to attach.");
          return;
      }

      linkProceduresToVisit(activeVisitState.visit.id, activeVisitState.selectedProcedureIds);
      
      setLocalItems(prev => prev.map(item => {
          if (activeVisitState.selectedProcedureIds.includes(item.id)) {
              return { 
                  ...item, 
                  performedInVisitId: activeVisitState.visit.id,
                  procedureStatus: item.procedureStatus === 'PLANNED' ? 'SCHEDULED' : item.procedureStatus
              };
          }
          return item;
      }));

      loadVisits();
      setActiveVisitState(null);
  };

  const handleCancelVisitMode = () => {
      loadVisits();
      setActiveVisitState(null);
  };

  const handleOpenVisitDetail = (visit: Visit) => {
      setActiveDetailVisit(visit);
      setShowExistingVisitsModal(false);
  };

  // Refresh handler passed to VisitDetailModal
  const handleVisitUpdate = () => {
      loadVisits();
      
      // Refresh local state from storage to reflect external updates (e.g. status changes, diagnosis codes)
      // This replaces the window.location.reload() call
      const updatedData = getTreatmentPlanById(plan.id);
      if (updatedData) {
          setLocalPlan(updatedData);
          if (updatedData.items) {
              setLocalItems(updatedData.items);
          }
      }
  };

  const totalChairTime = useMemo(() => localItems.reduce((sum, item) => sum + estimateChairTime(item), 0), [localItems]);
  const maxPhases = 8;

  // Grid Construction Logic
  const gridSlots = useMemo(() => {
      const slots: { type: 'PHASE' | 'ADD' | 'PLACEHOLDER', data?: TreatmentPhase, index: number }[] = [];
      
      // 1. Existing Phases from data
      phases.forEach((p, index) => {
          // If Hide Empty is enabled, only show phases that have items OR are monitor phases
          const hasItems = itemsByPhase[p.id] && itemsByPhase[p.id].length > 0;
          const shouldShow = showEmptyBuckets || hasItems || p.isMonitorPhase;
          
          if (shouldShow) {
              slots.push({ type: 'PHASE', data: p, index });
          }
      });

      // 2. Add Phase Button (if space)
      if (slots.length < maxPhases) {
          slots.push({ type: 'ADD', index: slots.length });
      }

      // 3. Placeholders (Only if showEmptyBuckets is true)
      if (showEmptyBuckets) {
          while (slots.length < maxPhases) {
              slots.push({ type: 'PLACEHOLDER', index: slots.length });
          }
      }
      
      return slots;
  }, [phases, showEmptyBuckets, itemsByPhase]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpenMenuPhaseId(null)} aria-modal="true" role="dialog">
        <div className="bg-slate-50 w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 relative">
          
          {/* Header */}
          <header className="shrink-0 px-5 py-3 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div>
                  <h2 className="text-lg font-bold text-gray-900">Treatment Plan Board</h2>
                  <p className="text-xs text-gray-500">{localPlan.caseAlias} - {localPlan.planNumber}</p>
               </div>
               {!activeVisitState && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowVisitModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors"
                    >
                      <Stethoscope size={14} /> Start Visit
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowExistingVisitsModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                      <HistoryIcon size={14} /> Existing Visits
                      {existingVisits.length > 0 && (
                        <span className="ml-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-200">
                          {existingVisits.length}
                        </span>
                      )}
                    </button>
                  </div>
               )}
            </div>
            
            <div className="flex items-center gap-4 text-xs">
                {/* Empty Buckets Toggle */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleAutoOrganize}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                        title="Auto-organize unlocked items into phases"
                    >
                        <Shuffle size={14} /> Auto-Organize
                    </button>
                    <button 
                        onClick={() => setShowEmptyBuckets(!showEmptyBuckets)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${showEmptyBuckets ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                        {showEmptyBuckets ? <Eye size={14} /> : <EyeOff size={14} />}
                        {showEmptyBuckets ? 'Hide Empty' : 'Show Empty'}
                    </button>
                </div>

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

          {/* VISIT MODE BANNER */}
          {activeVisitState && (
              <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-30 shrink-0 animate-in slide-in-from-top">
                  <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white/20 rounded-full animate-pulse"><Stethoscope size={20}/></div>
                      <div>
                          <h3 className="font-bold text-sm">Visit Mode Active</h3>
                          <p className="text-xs text-blue-100 opacity-90">Select completed procedures to attach to this visit ({activeVisitState.selectedProcedureIds.length} selected)</p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={handleCancelVisitMode} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                      <button onClick={handleAttachToVisit} className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-2">
                          <Check size={14}/> Attach & Finish
                      </button>
                  </div>
              </div>
          )}

          <div className="flex-1 overflow-hidden relative flex flex-row">
             {/* Wrapper Container - SCROLLS VERTICALLY ON MOBILE/TABLET, FIXED ON DESKTOP */}
             <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto lg:overflow-hidden h-full flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 pb-20 lg:pb-0 h-full">
                {gridSlots.map((slot) => {
                    const { type, data: phase, index } = slot;
                    const isAddPhaseSlot = type === 'ADD';
                    const isPlaceholder = type === 'PLACEHOLDER';
                    
                    if (phase) {
                        const phaseItems = itemsByPhase[phase.id] || [];
                        const procedureItems = phaseItems.filter(i => i.itemType !== 'ADDON');
                        const addOnItems = phaseItems.filter(i => i.itemType === 'ADDON');
                        const durationText = formatPhaseDuration(phase);

                        return (
                            <div key={phase.id} className={`flex flex-col border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden min-h-[300px] lg:min-h-0 lg:h-full`} onDragOver={e => handlePhaseDragOver(e, phase.id)} onDrop={e => handleDropOnPhase(e, phase.id)}>
                            <div className="p-3 border-b border-slate-200 shrink-0 relative bg-slate-50">
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
                                        <h3 className="font-black text-gray-800 truncate text-sm uppercase tracking-wide">
                                            {phase.title}
                                        </h3>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuPhaseId(phase.id === openMenuPhaseId ? null : phase.id); }} className={`p-1 rounded transition-colors ${openMenuPhaseId === phase.id ? 'bg-slate-200 text-gray-800 ring-2 ring-blue-400' : 'text-gray-400 hover:text-gray-600 hover:bg-slate-100'}`}><MoreHorizontal size={16}/></button>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 mt-1 font-medium">
                                    <span>Phase {phase.sortOrder + 1}</span>
                                    {durationText && <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{durationText}</span>}
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
                                        <ul className="py-1">
                                            <li><button onClick={() => handleRenameStart(phase.id, phase.title)} className="w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 flex items-center gap-2"><Edit size={14}/> Rename...</button></li>
                                            <li><button onClick={() => handleDeletePhase(phase.id)} className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Delete Phase</button></li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {phase.isMonitorPhase && (
                                <div className="p-2 bg-slate-100 border-b border-slate-200 shrink-0">
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

                            {/* Column Content - NO SCROLL, auto height */}
                            <div className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-0 transition-colors duration-300 ${dragOverPhaseId === phase.id ? 'bg-blue-50' : ''}`}>
                                {procedureItems.map(item => {
                                    const linkedAddOns = addOnItems.filter(s => s.linkedItemIds && s.linkedItemIds[0] === item.id);
                                    const isCompatibleTarget = draggingAddOnKind ? checkAddOnCompatibility(draggingAddOnKind, item.category) : false;
                                    const isTargeted = dragOverProcedureId === item.id;
                                    
                                    let cardClass = `p-3 rounded-xl border bg-white shadow-sm cursor-pointer transition-all border-l-4 ${getCategoryClass(item.category)}`;
                                    const isVisitSelected = activeVisitState?.selectedProcedureIds.includes(item.id);
                                    
                                    if (activeVisitState) {
                                        if (isVisitSelected) {
                                            cardClass += " ring-4 ring-blue-500 border-blue-500 z-10 shadow-lg scale-[1.02]";
                                        } else {
                                            cardClass += " opacity-60 hover:opacity-100 hover:ring-2 hover:ring-blue-300";
                                        }
                                    } else {
                                        if (draggingAddOnKind) {
                                        if (isCompatibleTarget) {
                                            cardClass += " ring-2 ring-blue-200 bg-blue-50/30";
                                            if (isTargeted) cardClass += " ring-2 ring-blue-600 bg-blue-100 shadow-xl scale-[1.02]";
                                        } else {
                                            cardClass += " opacity-30 grayscale";
                                        }
                                        } else if (draggingItemId === item.id) {
                                            cardClass += " opacity-30";
                                        } else {
                                            cardClass += " hover:shadow-md hover:translate-y-[-2px] hover:border-slate-300 active:cursor-grabbing";
                                        }
                                    }

                                    const visitInfo = item.performedInVisitId ? existingVisits.find(v => v.id === item.performedInVisitId) : null;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <div 
                                                draggable={!activeVisitState}
                                                onClick={() => {
                                                    if (activeVisitState) handleToggleProcedureSelection(item.id);
                                                    else setSelectedItemId(item.id);
                                                }}
                                                onDragStart={e => handleDragStart(e, item.id)} 
                                                onDragEnd={handleGlobalDragEnd} 
                                                onDragOver={e => handleProcedureDragOver(e, item)}
                                                onDragLeave={e => handleProcedureDragLeave(e, item)}
                                                onDrop={e => handleDropOnProcedure(e, item)}
                                                className={cardClass}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-gray-800 leading-snug flex-1">{item.procedureName}</p>
                                                    {activeVisitState && isVisitSelected ? (
                                                        <div className="bg-blue-600 text-white rounded-full p-0.5 ml-1"><Check size={12} strokeWidth={3}/></div>
                                                    ) : (
                                                        <div className="font-bold text-gray-900 text-xs ml-2">${item.netFee?.toFixed(0)}</div>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">{renderLocation(item) || item.procedureCode}</span>
                                                    <div className="flex items-center gap-1">
                                                        {!activeVisitState && !isLibraryOpen && <button 
                                                            onClick={(e) => { e.stopPropagation(); setIsLibraryOpen(true); }}
                                                            className="hover:text-blue-600 hover:bg-blue-50 rounded p-0.5 -mr-1" title="Add Add-On"
                                                        >
                                                            <Plus size={12} />
                                                        </button>}
                                                        {visitInfo && (
                                                            <span className={`px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${visitInfo.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`} title={`Performed on ${visitInfo.date}`}>
                                                                {visitInfo.status === 'COMPLETED' ? <Check size={8} /> : <Clock size={8} />}
                                                                {new Date(visitInfo.date).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {item.phaseLocked && !activeVisitState && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                                                        <button 
                                                            onClick={(e) => handleResetToAuto(e, item)}
                                                            className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                            title="Reset to automatic bucket assignment"
                                                        >
                                                            <RotateCcw size={8} /> Auto
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {linkedAddOns.map(addon => (
                                                <div key={addon.id} onClick={() => {
                                                    if (activeVisitState) handleToggleProcedureSelection(addon.id);
                                                    else setSelectedItemId(addon.id);
                                                }} className={`ml-4 mr-1 p-2 rounded-lg border bg-slate-50 border-gray-200 cursor-pointer hover:border-blue-300 relative before:content-[''] before:absolute before:left-[-12px] before:top-[-10px] before:w-[10px] before:h-[24px] before:border-l before:border-b before:border-gray-300 before:rounded-bl-md transition-opacity duration-300 ${draggingItemId === item.id ? 'opacity-30' : ''} ${activeVisitState && activeVisitState.selectedProcedureIds.includes(addon.id) ? 'ring-2 ring-blue-500 border-blue-500 bg-white' : ''}`}>
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-xs font-medium text-gray-600 leading-snug flex-1">{addon.procedureName}</p>
                                                        <div className="font-bold text-gray-500 text-xs ml-2">${addon.netFee?.toFixed(0)}</div>
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 mt-0.5 italic flex justify-between">
                                                        <span>{addon.addOnKind === 'SEDATION' ? 'Sedation' : 'Add-On'}</span>
                                                        {addon.performedInVisitId && <Check size={10} className="text-green-600" />}
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

                    if (isAddPhaseSlot && !activeVisitState) {
                        return (
                            <div key="add-phase" className="flex flex-col min-h-[300px] lg:min-h-0 lg:h-full p-2 border border-slate-200 border-dashed rounded-xl bg-slate-50/50 hover:bg-slate-100/80 items-center justify-center transition-colors">
                                <button onClick={handleAddPhase} className="flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-colors p-6 rounded-xl">
                                    <Plus size={32}/>
                                    <span className="text-sm font-bold">Add Phase</span>
                                </button>
                            </div>
                        );
                    }

                    if (isPlaceholder && !activeVisitState) {
                        return (
                            <div key={`placeholder-${index}`} className="flex flex-col min-h-[300px] lg:min-h-0 lg:h-full p-2 border border-slate-100 border-dashed rounded-xl bg-slate-50/30 items-center justify-center">
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-xs font-semibold text-slate-300">Phase {index + 1}</span>
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
                </div>
             </div>

             {/* Add-Ons Library Panel */}
             {isLibraryOpen && (
                 <AddOnsLibraryPanel 
                    onClose={() => setIsLibraryOpen(false)}
                    feeScheduleType={localPlan.feeScheduleType}
                    onDragStartAddOn={setDraggingAddOnKind}
                    onDragEndAddOn={handleGlobalDragEnd}
                 />
             )}
          </div>
          
          <footer className="shrink-0 px-4 py-3 border-t bg-white flex items-center justify-between z-20">
              <div className="text-xs text-gray-500">{phases.length} phases visible.</div>
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
      <VisitCreationModal isOpen={showVisitModal} onClose={() => setShowVisitModal(false)} onCreate={handleStartVisit} />
      <ExistingVisitsModal 
        isOpen={showExistingVisitsModal} 
        onClose={() => setShowExistingVisitsModal(false)} 
        visits={existingVisits} 
        onOpenDetail={handleOpenVisitDetail} 
      />
      {activeDetailVisit && (
          <VisitDetailModal 
            isOpen={!!activeDetailVisit} 
            onClose={() => setActiveDetailVisit(null)}
            visit={activeDetailVisit}
            items={localItems}
            onUpdate={handleVisitUpdate}
          />
      )}
    </>
  );
};
