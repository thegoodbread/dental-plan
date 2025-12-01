
import React, { useState } from 'react';
import { TreatmentPlanItem, UrgencyLevel } from '../types';
import { Trash2, Edit2, Check, X, AlertTriangle, Clock, Smile, Calculator, ChevronDown } from 'lucide-react';
import { ToothSelectorModal } from './ToothSelectorModal';
import { NumberPadModal } from './NumberPadModal';
import { SEDATION_TYPES } from '../services/treatmentPlans';

const NumpadButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200 shrink-0"
    aria-label="Open number pad"
  >
    <Calculator size={16} />
  </button>
);

interface TreatmentPlanItemRowProps {
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDelete: (id: string) => void;
  // New props for hierarchy
  isAddOn?: boolean;
  linkedItemNames?: string[];
  onAddSedation?: (parentItemId: string) => void;
  // Drag & Drop
  onDragOver?: (e: React.DragEvent, item: TreatmentPlanItem) => void;
  onDragLeave?: (e: React.DragEvent, item: TreatmentPlanItem) => void;
  onDrop?: (e: React.DragEvent, item: TreatmentPlanItem) => void;
  isDragOver?: boolean;
  isCompatibleDropTarget?: boolean;
}

export const TreatmentPlanItemRow: React.FC<TreatmentPlanItemRowProps> = ({ 
    item, onUpdate, onDelete, 
    isAddOn = false, linkedItemNames = [], onAddSedation,
    onDragOver, onDragLeave, onDrop, isDragOver, isCompatibleDropTarget
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isToothSelectorOpen, setIsToothSelectorOpen] = useState(false);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  
  // Local state for edit mode
  const [baseFee, setBaseFee] = useState(item.baseFee);
  const [urgency, setUrgency] = useState<UrgencyLevel>(item.urgency || 'ELECTIVE');

  const handleSave = () => {
    onUpdate(item.id, {
        baseFee: Number(baseFee),
        urgency: isAddOn ? undefined : urgency
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsConfirmingDelete(false);
  };

  const handleStartEditing = () => {
    setBaseFee(item.baseFee);
    setUrgency(item.urgency || 'ELECTIVE');
    setIsEditing(true);
  };

  const handleImmediateSedationTypeChange = (newType: string) => {
      const def = SEDATION_TYPES.find(t => t.label === newType);
      if (def) {
          onUpdate(item.id, {
              sedationType: newType,
              procedureName: `Sedation – ${newType}`,
              baseFee: def.defaultFee
          });
          setBaseFee(def.defaultFee);
      }
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

  // --- RENDER HELPERS ---

  const renderSelectionInput = () => {
    if (isAddOn) {
        return (
            <div className="text-xs text-gray-400 italic">
                {linkedItemNames.length > 0 ? (
                    <>
                        Applies to: <span className="text-gray-500">{linkedItemNames[0]}</span>
                        {linkedItemNames.length > 1 && `, +${linkedItemNames.length - 1} more`}
                    </>
                ) : 'Linked to procedure'}
            </div>
        );
    }

    if (item.unitType === 'PER_TOOTH') {
      const teethText = item.selectedTeeth?.length ? `Teeth: #${item.selectedTeeth.join(', #')}` : 'No teeth selected';
      if (isEditing) {
        return (
          <div className="flex flex-col items-start gap-2">
            <span className="text-gray-600 text-sm">{teethText}</span>
            <button
              onClick={() => setIsToothSelectorOpen(true)}
              className="w-full text-center py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm border border-gray-200"
            >
              Change Selected Teeth
            </button>
          </div>
        );
      }
      return (
        <span className="text-gray-900 font-medium">
          {item.selectedTeeth?.length ? `#${item.selectedTeeth.join(', #')}` : 'No teeth selected'}
        </span>
      );
    }

    if (item.unitType === 'PER_QUADRANT') {
      return (
        <div className="flex gap-1">
          {(['UR', 'UL', 'LR', 'LL'] as const).map(q => (
            <button
              key={q}
              onClick={() => toggleQuadrant(q)}
              className={`px-2 py-0.5 text-xs rounded border ${
                item.selectedQuadrants?.includes(q) 
                ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold' 
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      );
    }

    if (item.unitType === 'PER_ARCH') {
      return (
        <div className="flex gap-1">
          {(['UPPER', 'LOWER'] as const).map(a => (
            <button
              key={a}
              onClick={() => toggleArch(a)}
              className={`px-2 py-0.5 text-xs rounded border ${
                item.selectedArches?.includes(a) 
                ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold' 
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      );
    }
    
    return <span className="text-gray-400 text-xs italic">N/A</span>;
  };

  const renderUrgencyBadge = (u: UrgencyLevel) => {
    if (isAddOn) return null; // No urgency for add-ons
    switch (u) {
      case 'URGENT': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase"><AlertTriangle size={10} /> Urgent</span>;
      case 'SOON': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase"><Clock size={10} /> Soon</span>;
      case 'ELECTIVE': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase"><Smile size={10} /> Elective</span>;
    }
  };

  const rowBackground = isDragOver 
    ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' 
    : isCompatibleDropTarget 
        ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-300 border-blue-200' // Subtle glow for compatibility
        : isEditing 
            ? 'bg-blue-50/30' 
            : isAddOn 
                ? 'bg-slate-50' 
                : '';
            
  const textClass = isAddOn ? 'text-gray-600' : 'text-gray-900';
  const displayedSedationType = item.sedationType || item.procedureName.replace('Sedation – ', '');

  return (
    <>
      <tr 
        onDragOver={isAddOn ? undefined : (e) => onDragOver?.(e, item)}
        onDragLeave={isAddOn ? undefined : (e) => onDragLeave?.(e, item)}
        onDrop={isAddOn ? undefined : (e) => onDrop?.(e, item)}
        className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-all ${rowBackground}`}
      >
        {/* Procedure */}
        <td className={`px-4 py-3 align-top ${isAddOn ? 'pl-10 relative' : ''}`}>
          {isAddOn && (
             <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-gray-100 flex justify-center pt-4">
                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
             </div>
          )}
          
          {isAddOn && item.addOnKind === 'SEDATION' ? (
             <div className="flex flex-col gap-1">
                  <div className="relative inline-block w-full max-w-[240px]">
                      <select 
                         value={displayedSedationType} 
                         onChange={e => handleImmediateSedationTypeChange(e.target.value)}
                         className="appearance-none font-medium text-sm text-gray-700 bg-transparent border-none p-0 pr-6 focus:ring-0 cursor-pointer hover:text-blue-600 w-full truncate"
                         onClick={(e) => e.stopPropagation()}
                       >
                         {SEDATION_TYPES.map(t => <option key={t.label} value={t.label}>Sedation – {t.label}</option>)}
                       </select>
                       <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                   </div>
                 <div className="text-xs text-gray-500 font-mono mb-1">{item.procedureCode}</div>
             </div>
          ) : (
             <>
                 <div className={`font-medium text-sm ${textClass}`}>{item.procedureName}</div>
                 <div className="text-xs text-gray-500 font-mono mb-1">{item.procedureCode}</div>
             </>
          )}
          
          {isEditing && !isAddOn ? (
            <select 
              value={urgency} 
              onChange={e => setUrgency(e.target.value as UrgencyLevel)}
              className="text-xs border border-gray-300 rounded p-1 mt-1 bg-white text-gray-900 shadow-sm outline-none focus:ring-1 focus:ring-blue-500 block w-full"
            >
              <option value="ELECTIVE">Elective</option>
              <option value="SOON">Soon</option>
              <option value="URGENT">Urgent</option>
            </select>
          ) : (
            !isAddOn && <div className="mt-1">{renderUrgencyBadge(item.urgency || 'ELECTIVE')}</div>
          )}
        </td>

        {/* Selection Area */}
        <td className="px-4 py-3 text-sm align-top">
          {renderSelectionInput()}
        </td>

        {/* Cost (Base Fee) */}
        <td className="px-4 py-3 text-right text-sm align-top pt-3">
          {isEditing ? (
            <div className="flex items-center justify-end gap-1.5 w-full">
                <div className="relative grow">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                    <input 
                        type="number" 
                        className="w-full text-right border border-gray-300 rounded px-1 py-1 pl-5 text-gray-900 bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                        value={baseFee}
                        onFocus={(e) => e.target.select()}
                        onChange={e => setBaseFee(parseFloat(e.target.value) || 0)}
                    />
                </div>
                <NumpadButton onClick={() => setIsNumpadOpen(true)} />
            </div>
          ) : (
            <span className={textClass}>${item.baseFee.toFixed(2)}</span>
          )}
        </td>

        {/* Units */}
        <td className="px-4 py-3 text-center text-sm font-medium text-gray-700 align-top pt-3">
          {item.units}
        </td>

        {/* Net Fee */}
        <td className={`px-4 py-3 text-right text-sm font-bold align-top pt-3 ${isAddOn ? 'text-gray-700 bg-slate-100/50' : 'text-gray-900 bg-gray-50/50'}`}>
          ${item.netFee.toFixed(2)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right align-top pt-3">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check size={16}/></button>
              <button onClick={handleCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={16}/></button>
            </div>
          ) : isConfirmingDelete ? (
            <div className="flex justify-end items-center gap-2">
                <span className="text-xs text-red-700 font-medium animate-in fade-in">Sure?</span>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-md"><Check size={14}/></button>
                <button onClick={() => setIsConfirmingDelete(false)} className="p-1.5 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md"><X size={14}/></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button onClick={handleStartEditing} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16}/></button>
              <button onClick={() => setIsConfirmingDelete(true)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
            </div>
          )}
        </td>
      </tr>

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
