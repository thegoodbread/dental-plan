import React, { useState } from 'react';
import { TreatmentPlanItem } from '../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { ToothSelector } from './ToothSelector';

interface TreatmentPlanItemRowProps {
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  onDelete: (id: string) => void;
}

export const TreatmentPlanItemRow: React.FC<TreatmentPlanItemRowProps> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for edit mode
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>(item.selectedTeeth || []);
  const [baseFee, setBaseFee] = useState(item.baseFee);
  const [discount, setDiscount] = useState(item.discount);

  const handleSave = () => {
    onUpdate(item.id, {
      selectedTeeth,
      baseFee: Number(baseFee),
      discount: Number(discount)
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedTeeth(item.selectedTeeth || []);
    setBaseFee(item.baseFee);
    setDiscount(item.discount);
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

  // --- RENDER HELPERS ---

  const renderSelectionInput = () => {
    if (item.unitType === 'PER_TOOTH') {
      if (isEditing) {
        return (
          <ToothSelector 
            selectedTeeth={selectedTeeth} 
            onChange={setSelectedTeeth} 
          />
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

  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-colors ${isEditing ? 'bg-blue-50/30' : ''}`}>
      {/* Procedure */}
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-gray-900 text-sm">{item.procedureName}</div>
        <div className="text-xs text-gray-500 font-mono">{item.procedureCode}</div>
      </td>

      {/* Selection Area */}
      <td className="px-4 py-3 text-sm align-top">
        {renderSelectionInput()}
      </td>

      {/* Unit Type */}
      <td className="px-4 py-3 text-xs text-gray-500 align-top pt-4">
        {item.unitType.replace('PER_', '').toLowerCase()}
      </td>

      {/* Base Fee */}
      <td className="px-4 py-3 text-right text-sm align-top pt-3">
        {isEditing ? (
          <input 
            type="number" 
            className="w-20 text-right border border-gray-300 rounded px-1 py-1"
            value={baseFee}
            onChange={e => setBaseFee(Number(e.target.value))}
          />
        ) : (
          <span>${item.baseFee.toFixed(2)}</span>
        )}
      </td>

      {/* Units */}
      <td className="px-4 py-3 text-center text-sm font-medium text-gray-700 align-top pt-3">
        {item.units}
      </td>

      {/* Gross Fee */}
      <td className="px-4 py-3 text-right text-sm text-gray-500 align-top pt-3">
        ${item.grossFee.toFixed(2)}
      </td>

      {/* Discount */}
      <td className="px-4 py-3 text-right text-sm align-top pt-3">
        {isEditing ? (
          <input 
            type="number" 
            className="w-16 text-right border border-gray-300 rounded px-1 py-1 text-red-600"
            value={discount}
            onChange={e => setDiscount(Number(e.target.value))}
          />
        ) : (
          item.discount > 0 ? <span className="text-red-500">-${item.discount.toFixed(2)}</span> : '-'
        )}
      </td>

      {/* Net Fee */}
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 bg-gray-50/50 align-top pt-3">
        ${item.netFee.toFixed(2)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right align-top pt-3">
        {isEditing ? (
          <div className="flex justify-end gap-2">
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check size={16}/></button>
            <button onClick={handleCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={16}/></button>
          </div>
        ) : (
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16}/></button>
            <button onClick={() => onDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
          </div>
        )}
      </td>
    </tr>
  );
};