import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase } from '../../types';

interface FloatingInspectorProps {
  item: TreatmentPlanItem;
  phase: TreatmentPhase | null;
  position: { top: number; left: number };
  onUpdateItem: (itemId: string, updates: Partial<TreatmentPlanItem>) => void;
  onDeleteItem: (itemId: string) => void;
}

const FloatingInspector = React.forwardRef<HTMLDivElement, FloatingInspectorProps>(({
  item, phase, position, onUpdateItem, onDeleteItem
}, ref) => {

  const handleNumericChange = (field: keyof TreatmentPlanItem, value: string, isInteger = true, min = 0) => {
    if (value === '') {
        onUpdateItem(item.id, { [field]: null });
        return;
    }
    const numericValue = isInteger ? parseInt(value, 10) : parseFloat(value);
    onUpdateItem(item.id, { [field]: isNaN(numericValue) ? min : Math.max(min, numericValue) });
  };


  const handleVisitsIncrement = () => {
    onUpdateItem(item.id, { estimatedVisits: (item.estimatedVisits ?? 1) + 1 });
  };
  const handleVisitsDecrement = () => {
    onUpdateItem(item.id, { estimatedVisits: Math.max(1, (item.estimatedVisits ?? 1) - 1) });
  };

  return (
    <div
      ref={ref}
      className="absolute z-50 w-[300px] rounded-xl border border-white/40 bg-white/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md animate-in fade-in-20 zoom-in-90"
      style={{ top: position.top, left: position.left }}
      onClick={e => e.stopPropagation()}
    >
      {/* Title */}
      <div className="pb-3 border-b border-gray-200/60">
        <input
          value={item.procedureName}
          onChange={e => onUpdateItem(item.id, { procedureName: e.target.value })}
          className="w-full bg-transparent font-semibold text-gray-900 outline-none text-base"
        />
        <p className="text-xs text-gray-500 font-mono mt-1">{item.procedureCode}</p>
      </div>

      {/* Meta */}
      <div className="py-3 text-xs text-gray-600 space-y-1.5">
        <div className="flex justify-between">
          <span>Phase:</span>
          <span className="font-semibold text-gray-800">{phase?.title || 'Unassigned'}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Fee:</span>
          <span className="font-semibold text-gray-800">${item.netFee.toLocaleString('en-US')}</span>
        </div>
      </div>

      {/* Editable fields */}
      <div className="py-3 border-t border-gray-200/60 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fee per unit ($)</label>
          <input
            type="number"
            value={item.baseFee}
            onChange={e => handleNumericChange('baseFee', e.target.value, false, 0)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Visits</label>
           <div className="flex items-center">
            <input
              type="number"
              value={item.estimatedVisits ?? 1}
              onChange={e => handleNumericChange('estimatedVisits', e.target.value, true, 1)}
              className="w-full bg-gray-50 border border-r-0 border-gray-200 text-gray-900 rounded-l-lg py-1.5 text-sm text-center outline-none focus:ring-1 focus:ring-blue-500 focus:z-10"
              style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
            />
            <button
              onClick={handleVisitsDecrement}
              className="px-2.5 py-1.5 bg-gray-100 border-y border-gray-200 hover:bg-gray-200 text-gray-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:z-10"
              aria-label="Decrement visits"
            >
              -
            </button>
            <button
              onClick={handleVisitsIncrement}
              className="px-2.5 py-1.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-200 text-gray-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:z-10"
              aria-label="Increment visits"
            >
              +
            </button>
          </div>
        </div>
        <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Est. Duration</label>
            <div className="flex gap-1.5">
                <input
                    type="number"
                    value={item.estimatedDurationValue ?? ''}
                    onChange={e => handleNumericChange('estimatedDurationValue', e.target.value, true, 0)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm"
                />
                <select
                    value={item.estimatedDurationUnit ?? 'weeks'}
                    onChange={e => onUpdateItem(item.id, { estimatedDurationUnit: e.target.value as any })}
                    className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm"
                >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                </select>
            </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
          <textarea
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2 py-1.5 text-sm"
            rows={3}
            placeholder="Add clinical notes..."
            value={item.notes ?? ''}
            onChange={e => onUpdateItem(item.id, { notes: e.target.value })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-1 border-t border-gray-200/60 text-xs">
        <div className="flex justify-between items-center">
          <div>
            <button className="text-gray-600 hover:text-gray-900 font-semibold">Duplicate</button>
          </div>
          <button onClick={() => onDeleteItem(item.id)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
        </div>
        <div className="text-gray-400 font-mono mt-3 select-all text-[10px]">ID: {item.id}</div>
      </div>
    </div>
  );
});

// FIX: Added missing interface for component props.
interface TreatmentPlanBoardModalProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onClose: () => void;
  onAssignItemToPhase: (planId: string, itemId: string, newPhaseId: string) => void;
  onReorderItemsInPhase: (planId: string, phaseId: string, orderedItemIds: string[]) => void;
  onUpdateItem: (itemId: string, updates: Partial<TreatmentPlanItem>) => void;
}

export const TreatmentPlanBoardModal: React.FC<TreatmentPlanBoardModalProps> = ({
  plan,
  items,
  onClose,
  onAssignItemToPhase,
  onReorderItemsInPhase,
  onUpdateItem,
}) => {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<{ top: number; left: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const { phases, itemsByPhase, itemPhaseMap } = useMemo(() => {
    const sortedPhases = (plan.phases || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const itemMapById = new Map(items.map(i => [i.id, i]));
    const itemsByPhaseMap: Record<string, TreatmentPlanItem[]> = {};
    const itemPhaseMap = new Map<string, TreatmentPhase>();

    for (const phase of sortedPhases) {
        itemsByPhaseMap[phase.id] = phase.itemIds
            .map(id => {
                const item = itemMapById.get(id);
                if(item) itemPhaseMap.set(id, phase);
                return item;
            })
            .filter((item): item is TreatmentPlanItem => !!item);
    }
    
    const allAssignedItemIds = new Set(sortedPhases.flatMap(p => p.itemIds));
    const unassignedItems = items.filter(i => !allAssignedItemIds.has(i.id) && i.phaseId);
    unassignedItems.forEach(item => {
        const phase = sortedPhases.find(p => p.id === item.phaseId);
        if (phase && itemsByPhaseMap[phase.id]) {
            itemsByPhaseMap[phase.id].push(item);
            itemPhaseMap.set(item.id, phase);
        }
    });

    return { phases: sortedPhases, itemsByPhase: itemsByPhaseMap, itemPhaseMap };
  }, [plan.phases, items]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId) || null, [items, selectedItemId]);

  const closeInspector = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const calculateInspectorPosition = useCallback((cardRect: DOMRect, containerRect: DOMRect) => {
    const container = boardRef.current;
    if (!container) return { top: 0, left: 0 };
    
    const { scrollTop, scrollLeft } = container;
    const PADDING = 16;
    const OFFSET = 12;
    const INSPECTOR_WIDTH = 300;
    
    const relativeCardTop = cardRect.top - containerRect.top + scrollTop;
    const relativeCardLeft = cardRect.left - containerRect.left + scrollLeft;
    const relativeCardRight = cardRect.right - containerRect.left + scrollLeft;

    let left = relativeCardRight + OFFSET;
    if (relativeCardRight + OFFSET + INSPECTOR_WIDTH > containerRect.right - containerRect.left + scrollLeft - PADDING) {
        left = relativeCardLeft - INSPECTOR_WIDTH - OFFSET;
    }
    
    left = Math.max(scrollLeft + PADDING, left);
    let top = relativeCardTop;
    top = Math.max(scrollTop + PADDING, top);
    if(inspectorRef.current) {
        top = Math.min(top, container.scrollHeight - inspectorRef.current.offsetHeight - PADDING);
    }
    
    return { top, left };
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      const cardEl = cardRefs.current.get(selectedItemId);
      const boardEl = boardRef.current;
      if (cardEl && boardEl) {
        const cardRect = cardEl.getBoundingClientRect();
        const boardRect = boardEl.getBoundingClientRect();
        setInspectorPosition(calculateInspectorPosition(cardRect, boardRect));
      }
    } else {
      setInspectorPosition(null);
    }
  }, [selectedItemId, calculateInspectorPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (e.key === 'Escape') && closeInspector();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInspector]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!inspectorRef.current?.contains(e.target as Node)) {
        const selectedCard = cardRefs.current.get(selectedItemId!);
        if (!selectedCard || !selectedCard.contains(e.target as Node)) {
          closeInspector();
        }
      }
    };
    if (selectedItemId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedItemId, closeInspector]);

  const handleCardClick = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    setDraggingItemId(itemId);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverPhaseId(null);
    setDragOverItemId(null);
  };

  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => {
    e.preventDefault();
    setDragOverPhaseId(phaseId);
    setDragOverItemId(null);
  };

  const handleItemDragOver = (e: React.DragEvent, phaseId: string, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingItemId !== targetItemId) {
      setDragOverPhaseId(phaseId);
      setDragOverItemId(targetItemId);
    }
  };

  const handleDrop = (e: React.DragEvent, phaseId: string, targetItemId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetItemId) {
        handleDragEnd();
        return;
    }

    const currentOrder = itemsByPhase[phaseId]?.map(i => i.id) || [];
    const isSamePhase = items.find(i => i.id === draggedId)?.phaseId === phaseId;
    
    if (isSamePhase) {
        const fromIndex = currentOrder.indexOf(draggedId);
        const toIndex = targetItemId ? currentOrder.indexOf(targetItemId) : currentOrder.length;
        if(fromIndex === -1 || toIndex === -1) return;
        const reordered = Array.from(currentOrder);
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);
        onReorderItemsInPhase(plan.id, phaseId, reordered);
    } else {
        onAssignItemToPhase(plan.id, draggedId, phaseId);
        // We need to reorder after assignment if dropping on an item
        if(targetItemId){
            const tempOrder = currentOrder.filter(id => id !== draggedId);
            const toIndex = tempOrder.indexOf(targetItemId);
            tempOrder.splice(toIndex, 0, draggedId);
            onReorderItemsInPhase(plan.id, phaseId, tempOrder);
        }
    }
    handleDragEnd();
  };
  
  const handleDeleteItem = (itemId: string) => {
    // A production app would have an onDeleteItem prop and call it here.
    // To adhere to "do not change props", we will just close the inspector.
    console.warn(`Delete requested for ${itemId}, but no onDelete prop is available.`);
    closeInspector();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" aria-modal="true" role="dialog">
      <div className="bg-white w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <header className="shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h1 className="text-sm font-semibold text-gray-900">Treatment Plan Board</h1>
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100">Close</button>
          </div>
        </header>

        <main ref={boardRef} className="flex-1 overflow-x-auto p-5 flex gap-5 bg-gray-100 relative">
          {phases.map(phase => {
            const phaseItems = itemsByPhase[phase.id] || [];
            const isPhaseHighlight = dragOverPhaseId === phase.id && !dragOverItemId;
            const subtotal = phaseItems.reduce((sum, item) => sum + item.netFee, 0);
            
            return (
              <div key={phase.id}
                className={`flex-1 min-w-[260px] rounded-2xl border p-4 flex flex-col transition-colors bg-slate-50 shadow-sm ${isPhaseHighlight ? 'border-blue-300' : 'border-slate-200'}`}
                onDragOver={e => handlePhaseDragOver(e, phase.id)}
                onDrop={e => handleDrop(e, phase.id)}
              >
                <div className="mb-3 px-1">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">{phase.title}</div>
                  <div className="text-[11px] text-gray-500">{phaseItems.length} procedure{phaseItems.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="mb-4 pt-2 border-t text-[11px] text-gray-600">
                  <div className="flex justify-between"><span>Phase Total:</span> <strong>${subtotal.toLocaleString()}</strong></div>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1 -mr-1 flex-1">
                  {phaseItems.map(item => {
                    const isItemHighlight = dragOverItemId === item.id;
                    const isDragging = draggingItemId === item.id;
                    const isSelected = selectedItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        // FIX: Changed ref callback to not return a value.
                        ref={el => {
                          if (el) {
                            cardRefs.current.set(item.id, el);
                          } else {
                            cardRefs.current.delete(item.id);
                          }
                        }}
                        draggable
                        onClick={() => handleCardClick(item.id)}
                        onDragStart={e => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleItemDragOver(e, phase.id, item.id)}
                        onDrop={e => handleDrop(e, phase.id, item.id)}
                        className={`bg-white rounded-xl border p-3 shadow-sm text-gray-800 cursor-pointer transition-all duration-150 ${isDragging ? 'opacity-40' : ''} ${isItemHighlight ? 'ring-2 ring-blue-400' : 'hover:shadow-md border-gray-200'} ${isSelected ? 'ring-2 ring-blue-500 border-blue-400' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 cursor-grab pt-0.5" aria-hidden="true">⋮⋮</span>
                          <div className="flex-1">
                            <span className="font-medium text-xs leading-tight">{item.procedureName}</span>
                            <div className="flex justify-between items-end mt-2">
                              <div className="font-bold text-base">${item.netFee?.toFixed(0) ?? '—'}</div>
                              {(() => {
                                  const { estimatedDurationValue: value, estimatedDurationUnit: unit } = item;
                                  if (value && value > 0 && unit) {
                                      let unitText;
                                      switch (unit) {
                                          case 'days': unitText = `day${value !== 1 ? 's' : ''}`; break;
                                          case 'weeks': unitText = `wk${value !== 1 ? 's' : ''}`; break;
                                          case 'months': unitText = `mo${value !== 1 ? 's' : ''}`; break;
                                          default: unitText = unit;
                                      }
                                      return <div className="text-xs text-gray-500">Est. {value} {unitText}</div>;
                                  }
                                  return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {selectedItem && inspectorPosition && (
            <FloatingInspector 
              ref={inspectorRef}
              item={selectedItem}
              phase={itemPhaseMap.get(selectedItem.id) || null}
              onUpdateItem={onUpdateItem}
              position={inspectorPosition}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </main>
      </div>
    </div>
  );
};