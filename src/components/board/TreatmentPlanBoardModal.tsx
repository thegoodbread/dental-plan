
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase, UrgencyLevel, FeeCategory, AddOnKind, Visit, VisitType, Provider, PHASE_BUCKET_LABELS } from '../../types';
import { Plus, X, MoreHorizontal, Clock, GripVertical, Edit, Trash2, Library, Calendar, Check, Stethoscope, History as HistoryIcon, ArrowRight, Eye, EyeOff, RotateCcw, Shuffle, PlusCircle, Timer } from 'lucide-react';
// FIX: Added linkProceduresToVisit to imports
import { SEDATION_TYPES, checkAddOnCompatibility, createAddOnItem, ADD_ON_LIBRARY, AddOnDefinition, createVisit, getVisitsForPlan, getTreatmentPlanById, getProviders, getProviderById, getPhaseIdForItem, updateTreatmentPlanItem, computeBucketKeyForItem, linkProceduresToVisit } from '../../services/treatmentPlans';
import { AddOnsLibraryPanel } from './AddOnsLibraryPanel';
import { VisitDetailModal } from './VisitDetailModal';
import { getProcedureDisplayName, getProcedureDisplayCode } from '../../utils/procedureDisplay';
import { generateSmarterPhaseTitle } from '../../domain/timelineGeneration';

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

    const code = item.procedureCode?.toUpperCase() || '';
    if (code.includes('D3330') || item.procedureName.toLowerCase().includes('molar')) {
        if (item.category === 'ENDODONTIC') return 90;
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
                    <input value={editedItem.procedureName} onChange={e => handleChange('procedureName', e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
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

interface TreatmentPlanBoardModalProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onClose: () => void;
  onSaveChanges: (plan: TreatmentPlan, items: TreatmentPlanItem[]) => void;
}

interface ActiveVisitState {
    visit: Visit;
    selectedProcedureIds: string[];
}

export const TreatmentPlanBoardModal: React.FC<TreatmentPlanBoardModalProps> = ({ plan, items, onClose, onSaveChanges }) => {
  const [localPlan, setLocalPlan] = useState<TreatmentPlan>(plan);
  const [localItems, setLocalItems] = useState<TreatmentPlanItem[]>(items);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [draggingAddOnKind, setDraggingAddOnKind] = useState<AddOnKind | null>(null);
  const [selectedAddOn, setSelectedAddOn] = useState<AddOnDefinition | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [dragOverProcedureId, setDragOverProcedureId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showEmptyBuckets, setShowEmptyBuckets] = useState(true);
  
  const [openMenuPhaseId, setOpenMenuPhaseId] = useState<string | null>(null);
  const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
    const itemsByPhaseMap: Record<string, TreatmentPlanItem[]> = {};
    allPhases.forEach(p => itemsByPhaseMap[p.id] = []);
    
    const firstPhaseId = allPhases.length > 0 ? allPhases[0].id : null;

    localItems.forEach(item => {
        let targetPhaseId = item.phaseId;
        // SELF-HEALING: If an item has no phase assigned, automatically default it 
        // to the first phase so it is visible and manageable on the board.
        if (!targetPhaseId || !itemsByPhaseMap[targetPhaseId]) {
            targetPhaseId = firstPhaseId || undefined;
        }

        if (targetPhaseId && itemsByPhaseMap[targetPhaseId]) {
            itemsByPhaseMap[targetPhaseId].push(item);
        }
    });

    Object.values(itemsByPhaseMap).forEach(list => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return { phases: allPhases, itemsByPhase: itemsByPhaseMap };
  }, [localPlan.phases, localItems]);

  const handleGlobalDragEnd = useCallback(() => {
    setDraggingItemId(null);
    setDraggingAddOnKind(null);
    setDragOverPhaseId(null);
    setDragOverProcedureId(null);
  }, []);

  const handleDragStart = (e: React.DragEvent, itemId: string) => { 
    if (activeVisitState) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move'; 
    e.dataTransfer.setData('text/plain', itemId); 
    setDraggingItemId(itemId); 
  };
  
  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => { 
      if (activeVisitState) return;
      if (draggingItemId) { e.preventDefault(); setDragOverPhaseId(phaseId); }
  };
  
  const handleProcedureDragOver = (e: React.DragEvent, procedure: TreatmentPlanItem) => {
      if (activeVisitState) return;
      const isCompatible = draggingAddOnKind ? checkAddOnCompatibility(draggingAddOnKind, procedure.category) : 
                          selectedAddOn ? checkAddOnCompatibility(selectedAddOn.kind, procedure.category) : false;
      if (isCompatible) {
          e.preventDefault();
          e.stopPropagation();
          setDragOverProcedureId(procedure.id);
      }
  };
  
  const handleProcedureDragLeave = (e: React.DragEvent, procedure: TreatmentPlanItem) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (dragOverProcedureId === procedure.id) setDragOverProcedureId(null);
  };
  
  const handleDropOnPhase = (e: React.DragEvent, phaseId: string) => {
    if (activeVisitState) return;
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) { handleGlobalDragEnd(); return; }
    const draggedItem = localItems.find(i => i.id === draggedId);
    if (!draggedItem) { handleGlobalDragEnd(); return; }

    const targetPhase = localPlan.phases?.find(p => p.id === phaseId);
    
    if (targetPhase && (itemsByPhase[phaseId] || []).length === 0 && !targetPhase.titleIsManual && !targetPhase.isMonitorPhase) {
        const bucket = computeBucketKeyForItem(draggedItem);
        const newTitle = generateSmarterPhaseTitle(targetPhase.sortOrder, bucket, [draggedItem]);
        setLocalPlan(prev => ({ ...prev, phases: prev.phases?.map(p => p.id === phaseId ? { ...p, title: newTitle, bucketKey: bucket } : p) }));
    }

    const linkedAddOnItems = localItems.filter(i => i.itemType === 'ADDON' && i.linkedItemIds?.includes(draggedId));
    const idsToMove = [draggedId, ...linkedAddOnItems.map(s => s.id)];
    
    setLocalItems(prevItems => prevItems.map(item => {
        if (idsToMove.includes(item.id)) return { ...item, phaseId, phaseLocked: true } as any; 
        return item;
    }));
    handleGlobalDragEnd();
  };

  const handleAttachAddOn = (targetItem: TreatmentPlanItem, fromAddOn?: AddOnDefinition) => {
      const addon = fromAddOn || selectedAddOn;
      if (!addon) return;
      const newItem = createAddOnItem(localPlan.id, {
          addOnKind: addon.kind,
          procedureName: addon.label,
          baseFee: localPlan.feeScheduleType === 'membership' && addon.membershipFee ? addon.membershipFee : addon.defaultFee,
          phaseId: targetItem.phaseId || '',
          linkedItemIds: [targetItem.id],
          category: addon.category,
          procedureCode: addon.defaultCode
      });
      setLocalItems(prev => [...prev, newItem]);
      if (!fromAddOn) setSelectedAddOn(null);
  };

  const handleDropOnProcedure = (e: React.DragEvent, targetProcedure: TreatmentPlanItem) => {
      if (activeVisitState) return;
      e.preventDefault(); e.stopPropagation();
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!rawData) return handleGlobalDragEnd();
      try {
          const data = JSON.parse(rawData);
          if (data.type === 'ADDON_TEMPLATE') {
              const definition = data as AddOnDefinition;
              if (!checkAddOnCompatibility(definition.kind, targetProcedure.category)) {
                  alert(`Incompatible add-on for this procedure.`);
              } else {
                  handleAttachAddOn(targetProcedure, definition);
              }
          }
      } catch (err) { console.error("Drop error", err); }
      handleGlobalDragEnd();
      setSelectedAddOn(null);
  };

  const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
    setLocalItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    closeEditor();
  };

  const handleDeleteItem = (itemId: string) => {
    const toDelete = localItems.find(i => i.id === itemId);
    if (!toDelete) return;
    let updatedItems = localItems.filter(i => i.id !== itemId && !(i.linkedItemIds && i.linkedItemIds.includes(itemId)));
    setLocalItems(updatedItems); closeEditor();
  };

  const handleAddPhase = () => {
    if ((localPlan.phases?.length ?? 0) >= 8) return;
    const newPhase: TreatmentPhase = { id: generateId(), planId: localPlan.id, bucketKey: 'OTHER', title: 'New Phase', sortOrder: localPlan.phases?.length ?? 0, itemIds: [], isMonitorPhase: false, durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null, titleIsManual: false };
    setLocalPlan(prev => ({ ...prev, phases: [...(prev.phases || []), newPhase] }));
  };

  const handleSaveAndClose = () => { onSaveChanges(localPlan, localItems); onClose(); };
  const handleRenameStart = (phaseId: string, currentTitle: string) => { setRenamingPhaseId(phaseId); setRenameValue(currentTitle); setOpenMenuPhaseId(null); };
  const handleRenameSave = () => { if (!renamingPhaseId) return; setLocalPlan(prev => ({ ...prev, phases: prev.phases?.map(p => p.id === renamingPhaseId ? { ...p, title: renameValue, titleIsManual: true } : p) })); setRenamingPhaseId(null); setRenameValue(''); };
  const handleRenameCancel = () => { setRenamingPhaseId(null); setRenameValue(''); };
  const handleRenameKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRenameSave(); if (e.key === 'Escape') handleRenameCancel(); };
  const handleDeletePhase = (phaseId: string) => { if ((itemsByPhase[phaseId] || []).length > 0) { if (!window.confirm("Delete this phase and its procedures?")) return; } setLocalItems(prev => prev.filter(item => item.phaseId !== phaseId)); setLocalPlan(prev => { const updatedPhases = prev.phases?.filter(p => p.id !== phaseId) ?? []; updatedPhases.forEach((p, index) => { p.sortOrder = index; }); return { ...prev, phases: updatedPhases }; }); setOpenMenuPhaseId(null); };
  // FIX: Fixed type mismatch for durationIsManual which must be a boolean.
  const handleToggleMonitorPhase = (phaseId: string) => { setLocalPlan(prev => ({ ...prev, phases: prev.phases?.map(p => p.id === phaseId ? { ...p, isMonitorPhase: !p.isMonitorPhase, durationIsManual: !p.isMonitorPhase, estimatedDurationValue: !p.isMonitorPhase ? 2 : null, estimatedDurationUnit: !p.isMonitorPhase ? 'months' : null } : p) })); };
  const handleUpdatePhaseDuration = (phaseId: string, field: 'value' | 'unit', value: string) => { setLocalPlan(prev => ({ ...prev, phases: prev.phases?.map(p => p.id === phaseId ? { ...p, durationIsManual: true, estimatedDurationValue: field === 'value' ? parseInt(value, 10) || null : p.estimatedDurationValue, estimatedDurationUnit: field === 'unit' ? value as any : p.estimatedDurationUnit } : p) })); };
  
  const handleStartVisit = (date: string, providerId: string, type: VisitType) => { const provider = getProviderById(providerId); const newVisit = createVisit({ treatmentPlanId: plan.id, date, providerId, provider: provider?.fullName || 'Unknown', visitType: type, attachedProcedureIds: [] }); setExistingVisits(prev => [...prev, newVisit]); setActiveVisitState({ visit: newVisit, selectedProcedureIds: [] }); setShowVisitModal(false); };
  const handleToggleProcedureSelection = (procedureId: string) => { if (!activeVisitState) return; setActiveVisitState(prev => { if (!prev) return null; const isSelected = prev.selectedProcedureIds.includes(procedureId); return { ...prev, selectedProcedureIds: isSelected ? prev.selectedProcedureIds.filter(id => id !== procedureId) : [...prev.selectedProcedureIds, procedureId] }; }); };
  // FIX: linkProceduresToVisit is now correctly imported
  const handleAttachToVisit = () => { if (!activeVisitState) return; if (activeVisitState.selectedProcedureIds.length === 0) return; linkProceduresToVisit(activeVisitState.visit.id, activeVisitState.selectedProcedureIds); setLocalItems(prev => prev.map(item => activeVisitState.selectedProcedureIds.includes(item.id) ? { ...item, performedInVisitId: activeVisitState.visit.id, procedureStatus: item.procedureStatus === 'PLANNED' ? 'SCHEDULED' : item.procedureStatus } : item)); loadVisits(); setActiveVisitState(null); };
  const handleVisitUpdate = () => { loadVisits(); const updatedData = getTreatmentPlanById(plan.id); if (updatedData) { setLocalPlan(updatedData); if (updatedData.items) setLocalItems(updatedData.items); } };

  const handleOpenVisitDetail = (visit: Visit) => {
    setActiveDetailVisit(visit);
    setShowExistingVisitsModal(false);
  };

  // FIX: Implemented handleAutoOrganize stub
  const handleAutoOrganize = () => {
    setLocalItems(prev => prev.map(item => {
        if (item.phaseId) return item;
        const phaseId = getPhaseIdForItem(localPlan, item);
        return { ...item, phaseId: phaseId || undefined };
    }));
  };

  const totalChairTime = useMemo(() => localItems.reduce((sum, item) => sum + estimateChairTime(item), 0), [localItems]);
  const gridSlots = useMemo(() => {
      const slots: { type: 'PHASE' | 'ADD' | 'PLACEHOLDER', data?: TreatmentPhase, index: number }[] = [];
      phases.forEach((p, index) => { if (showEmptyBuckets || (itemsByPhase[p.id] || []).length > 0 || p.isMonitorPhase) slots.push({ type: 'PHASE', data: p, index }); });
      if (slots.length < 8) slots.push({ type: 'ADD', index: slots.length });
      if (showEmptyBuckets) { while (slots.length < 8) slots.push({ type: 'PLACEHOLDER', index: slots.length }); }
      return slots;
  }, [phases, showEmptyBuckets, itemsByPhase]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpenMenuPhaseId(null)}>
        <div className="bg-slate-50 w-full max-w-[98%] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 relative" onClick={e => e.stopPropagation()}>
          <header className="shrink-0 px-5 py-3 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-6"><div><h2 className="text-lg font-bold text-gray-900">Treatment Plan Board</h2><p className="text-xs text-gray-500">{localPlan.caseAlias} - {localPlan.planNumber}</p></div>
               {!activeVisitState && <div className="flex items-center gap-3"><button onClick={() => setShowVisitModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors"><Stethoscope size={14} /> Start Visit</button><button onClick={() => setShowExistingVisitsModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors"><HistoryIcon size={14} /> Existing Visits {existingVisits.length > 0 && <span className="ml-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-200">{existingVisits.length}</span>}</button></div>}
            </div>
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2"><button onClick={handleAutoOrganize} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors bg-white text-purple-600 border-purple-200 hover:bg-purple-50"><Shuffle size={14} /> Auto-Organize</button><button onClick={() => setShowEmptyBuckets(!showEmptyBuckets)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${showEmptyBuckets ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{showEmptyBuckets ? <Eye size={14} /> : <EyeOff size={14} />} {showEmptyBuckets ? 'Hide Empty' : 'Show Empty'}</button></div>
                <button onClick={() => setIsLibraryOpen(!isLibraryOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${isLibraryOpen ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}><Library size={16} /> Add-Ons Library</button>
                <div className="w-px h-6 bg-gray-200" /><div className="text-right"><div className="text-gray-500 uppercase font-semibold">Production</div><div className="font-bold text-gray-900 text-sm">${localPlan.totalFee.toLocaleString()}</div></div>
                <div className="w-px h-6 bg-gray-200" /><div className="text-right"><div className="text-gray-500 uppercase font-semibold">Pt. Portion</div><div className="font-bold text-blue-600 text-sm">${localPlan.patientPortion.toLocaleString()}</div></div>
                <div className="w-px h-6 bg-gray-200" /><div className="text-right"><div className="text-gray-500 uppercase font-semibold">Chair Time</div><div className="font-bold text-gray-900 text-sm">{formatMinutes(totalChairTime)}</div></div>
            </div>
          </header>

          {activeVisitState && <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-30 shrink-0 animate-in slide-in-from-top"><div className="flex items-center gap-3"><div className="p-1.5 bg-white/20 rounded-full animate-pulse"><Stethoscope size={20}/></div><div><h3 className="font-bold text-sm">Visit Mode Active</h3><p className="text-xs text-blue-100 opacity-90">{activeVisitState.selectedProcedureIds.length} selected</p></div></div><div className="flex gap-3"><button onClick={() => setActiveVisitState(null)} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-bold transition-colors">Cancel</button><button onClick={handleAttachToVisit} className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-2"><Check size={14}/> Attach & Finish</button></div></div>}

          <div className="flex-1 overflow-hidden relative flex flex-row">
             <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto lg:overflow-hidden h-full flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 pb-20 lg:pb-0 h-full">
                {gridSlots.map((slot) => {
                    const { type, data: phase, index } = slot;
                    if (phase) {
                        const phaseItems = itemsByPhase[phase.id] || [];
                        const procedureItems = phaseItems.filter(i => i.itemType !== 'ADDON');
                        const addOnItems = phaseItems.filter(i => i.itemType === 'ADDON');
                        return (
                            <div key={phase.id} className="flex flex-col border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden h-full" onDragOver={e => handlePhaseDragOver(e, phase.id)} onDrop={e => handleDropOnPhase(e, phase.id)}>
                            <div className="p-3 border-b border-slate-200 shrink-0 relative bg-slate-50">
                                <div className="flex justify-between items-center">{renamingPhaseId === phase.id ? <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleRenameSave} onKeyDown={handleRenameKeyDown} className="font-semibold text-gray-800 truncate text-sm bg-white border border-blue-400 rounded-md px-2 py-0.5 w-full mr-2" /> : <h3 className="font-black text-gray-800 truncate text-sm uppercase tracking-wide">{phase.title}</h3>}<button onClick={(e) => { e.stopPropagation(); setOpenMenuPhaseId(phase.id === openMenuPhaseId ? null : phase.id); }} className={`p-1 rounded transition-colors ${openMenuPhaseId === phase.id ? 'bg-slate-200 text-gray-800 ring-2 ring-blue-400' : 'text-gray-400 hover:text-gray-600 hover:bg-slate-100'}`}><MoreHorizontal size={16}/></button></div>
                                
                                <div className="flex justify-between items-center text-xs text-gray-500 mt-1 font-medium">
                                    <div className="flex items-center gap-1">
                                        <span>Phase {phase.sortOrder + 1}</span>
                                        {phase.isMonitorPhase && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200 uppercase tracking-widest">Monitor</span>}
                                    </div>
                                    
                                    {phase.isMonitorPhase ? (
                                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="number" 
                                                className="w-8 text-center bg-transparent font-bold text-blue-600 outline-none"
                                                value={phase.estimatedDurationValue || ''}
                                                onChange={e => handleUpdatePhaseDuration(phase.id, 'value', e.target.value)}
                                            />
                                            <select 
                                                className="bg-transparent text-[10px] font-bold text-gray-600 outline-none cursor-pointer"
                                                value={phase.estimatedDurationUnit || ''}
                                                onChange={e => handleUpdatePhaseDuration(phase.id, 'unit', e.target.value)}
                                            >
                                                <option value="days">days</option>
                                                <option value="weeks">wks</option>
                                                <option value="months">mos</option>
                                            </select>
                                        </div>
                                    ) : (
                                        formatPhaseDuration(phase) && <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{formatPhaseDuration(phase)}</span>
                                    )}
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
                            <div className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-0 transition-colors duration-300 ${dragOverPhaseId === phase.id ? 'bg-blue-50' : ''}`}>
                                {procedureItems.map(item => {
                                    const linkedAddOns = addOnItems.filter(s => s.linkedItemIds && s.linkedItemIds[0] === item.id);
                                    const isCompatible = draggingAddOnKind ? checkAddOnCompatibility(draggingAddOnKind, item.category) : 
                                                       selectedAddOn ? checkAddOnCompatibility(selectedAddOn.kind, item.category) : false;
                                    const chairTime = estimateChairTime(item);
                                    let cardClass = `p-3 rounded-xl border bg-white shadow-sm cursor-pointer transition-all border-l-4 ${getCategoryClass(item.category)}`;
                                    if (activeVisitState) cardClass += activeVisitState.selectedProcedureIds.includes(item.id) ? " ring-4 ring-blue-500 border-blue-500" : " opacity-60";
                                    else if (isCompatible) cardClass += dragOverProcedureId === item.id ? " ring-2 ring-blue-600 bg-blue-100" : " ring-2 ring-blue-200 bg-blue-50/30";
                                    return (
                                        <React.Fragment key={item.id}>
                                            <div draggable={!activeVisitState} onClick={() => activeVisitState ? handleToggleProcedureSelection(item.id) : setSelectedItemId(item.id)} onDragStart={e => handleDragStart(e, item.id)} onDragEnd={handleGlobalDragEnd} onDragOver={e => handleProcedureDragOver(e, item)} onDragLeave={e => handleProcedureDragLeave(e, item)} onDrop={e => handleDropOnProcedure(e, item)} className={cardClass}>
                                                <div className="flex justify-between items-start"><p className="text-xs font-bold text-gray-800 leading-snug flex-1">{getProcedureDisplayName(item)}</p>{selectedAddOn && isCompatible && <button onClick={(e) => { e.stopPropagation(); handleAttachAddOn(item); }} className="p-1 bg-blue-600 text-white rounded-md shadow-sm hover:scale-110 active:scale-95 transition-transform ml-1"><PlusCircle size={14}/></button>}</div>
                                                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">{renderLocation(item) || getProcedureDisplayCode(item)}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center gap-0.5 opacity-60"><Timer size={10}/> {chairTime}m</span>
                                                        <div className="font-bold text-gray-900">${item.netFee?.toFixed(0)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {linkedAddOns.map(addon => <div key={addon.id} onClick={() => activeVisitState ? handleToggleProcedureSelection(addon.id) : setSelectedItemId(addon.id)} className={`ml-4 mr-1 p-2 rounded-lg border bg-slate-50 border-gray-200 cursor-pointer hover:border-blue-300 relative before:content-[''] before:absolute before:left-[-12px] before:top-[-10px] before:w-[10px] before:h-[24px] before:border-l before:border-b before:border-gray-300 before:rounded-bl-md ${activeVisitState && activeVisitState.selectedProcedureIds.includes(addon.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}><div className="flex justify-between items-start"><p className="text-[11px] font-medium text-gray-600 leading-tight flex-1">{addon.procedureName}</p><div className="font-bold text-gray-500 text-[10px] ml-2">${addon.netFee?.toFixed(0)}</div></div></div>)}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            </div>
                        );
                    }
                    if (type === 'ADD' && !activeVisitState) return <div key="add-phase" className="flex flex-col h-full border border-slate-200 border-dashed rounded-xl bg-slate-50/50 hover:bg-slate-100/80 items-center justify-center transition-colors"><button onClick={handleAddPhase} className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 p-6"><Plus size={32}/><span className="text-sm font-bold">Add Phase</span></button></div>;
                    if (type === 'PLACEHOLDER' && !activeVisitState) return <div key={`placeholder-${index}`} className="flex flex-col h-full border border-slate-100 border-dashed rounded-xl bg-slate-50/30 items-center justify-center"><span className="text-xs font-semibold text-slate-300">Phase {index + 1}</span></div>;
                    return null;
                })}
                </div>
             </div>
             {isLibraryOpen && <AddOnsLibraryPanel onClose={() => setIsLibraryOpen(false)} feeScheduleType={localPlan.feeScheduleType} onDragStartAddOn={setDraggingAddOnKind} onDragEndAddOn={handleGlobalDragEnd} selectedAddOn={selectedAddOn} onSelectAddOn={setSelectedAddOn} />}
          </div>
          <footer className="shrink-0 px-4 py-3 border-t bg-white flex items-center justify-end gap-2"><button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleSaveAndClose} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button></footer>
        </div>
      </div>
      {selectedItem && <ProcedureEditorModal item={selectedItem} onSave={handleUpdateItem} onClose={closeEditor} onDeleteItem={handleDeleteItem} />}
      <VisitCreationModal isOpen={showVisitModal} onClose={() => setShowVisitModal(false)} onCreate={handleStartVisit} />
      <ExistingVisitsModal isOpen={showExistingVisitsModal} onClose={() => setShowExistingVisitsModal(false)} visits={existingVisits} onOpenDetail={handleOpenVisitDetail} />
      {activeDetailVisit && <VisitDetailModal isOpen={!!activeDetailVisit} onClose={() => setActiveDetailVisit(null)} visit={activeDetailVisit} items={localItems} onUpdate={handleVisitUpdate} />}
    </>
  );
};
