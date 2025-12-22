import React, { useState } from 'react';
import { Search, X, GripVertical, Info, Check, MousePointer2 } from 'lucide-react';
import { AddOnDefinition, ADD_ON_LIBRARY } from '../../services/treatmentPlans';
import { FeeCategory, AddOnKind } from '../../types';

interface AddOnsLibraryPanelProps {
  onClose: () => void;
  feeScheduleType: 'standard' | 'membership';
  onDragStartAddOn?: (kind: AddOnKind) => void;
  onDragEndAddOn?: () => void;
  selectedAddOn?: AddOnDefinition | null;
  onSelectAddOn?: (addon: AddOnDefinition | null) => void;
}

const CATEGORIES: { id: FeeCategory | 'ALL', label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'SURGICAL', label: 'Surgical' },
  { id: 'RESTORATIVE', label: 'Restorative' },
  { id: 'OTHER', label: 'Sedation / Other' },
];

export const AddOnsLibraryPanel: React.FC<AddOnsLibraryPanelProps> = ({ 
  onClose, 
  feeScheduleType,
  onDragStartAddOn,
  onDragEndAddOn,
  selectedAddOn,
  onSelectAddOn
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<FeeCategory | 'ALL'>('ALL');

  const filteredLibrary = ADD_ON_LIBRARY.filter(addon => {
    const matchesSearch = addon.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          addon.defaultCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || 
                            (activeCategory === 'OTHER' && (addon.kind === 'SEDATION' || addon.category === 'OTHER' || addon.category === 'PERIO')) ||
                            addon.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: React.DragEvent, addon: AddOnDefinition) => {
    const payload = JSON.stringify({ type: 'ADDON_TEMPLATE', ...addon });
    // Support multiple data types for browser compatibility
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload); 
    e.dataTransfer.effectAllowed = 'copy';
    
    onDragStartAddOn?.(addon.kind);
    // Also mark as selected for click fallback logic
    onSelectAddOn?.(addon);
  };

  const handleDragEnd = () => {
    onDragEndAddOn?.();
  };

  const handleCardClick = (addon: AddOnDefinition) => {
      if (selectedAddOn?.defaultCode === addon.defaultCode) {
          onSelectAddOn?.(null);
      } else {
          onSelectAddOn?.(addon);
      }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <h3 className="font-bold text-gray-900">Add-Ons Library</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 bg-white space-y-3 shrink-0">
         <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
                type="text" 
                placeholder="Search add-ons..." 
                className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
         <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
                <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${activeCategory === cat.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                    {cat.label}
                </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-2 leading-relaxed">
             <div className="flex items-center gap-2 mb-1 text-blue-600 font-bold uppercase tracking-wider">
                <MousePointer2 size={12} /> Stamp Mode
             </div>
             Click an item below to "pick it up", then click the <span className="font-bold text-blue-600">+</span> icon on any procedure to attach.
          </div>

          {filteredLibrary.map((addon) => {
             const isSelected = selectedAddOn?.defaultCode === addon.defaultCode;
             return (
                 <div 
                    key={addon.defaultCode}
                    draggable
                    onDragStart={e => handleDragStart(e, addon)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleCardClick(addon)}
                    className={`
                        relative border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all group select-none
                        ${isSelected 
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-offset-2 scale-[1.02] shadow-md' 
                            : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300'
                        }
                    `}
                 >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>{addon.label}</span>
                        {isSelected ? <Check size={16} className="text-blue-600" /> : <GripVertical size={14} className="text-gray-300 group-hover:text-blue-400" />}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{addon.description}</div>
                    <div className="flex justify-between items-center border-t border-gray-50 pt-2">
                        <code className={`text-[10px] px-1 py-0.5 rounded font-mono ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{addon.defaultCode}</code>
                        <span className="text-xs font-semibold text-gray-900">
                            ${(feeScheduleType === 'membership' && addon.membershipFee ? addon.membershipFee : addon.defaultFee).toFixed(0)}
                        </span>
                    </div>
                 </div>
             );
          })}

          {filteredLibrary.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                  No add-ons found.
              </div>
          )}
      </div>
    </div>
  );
};
