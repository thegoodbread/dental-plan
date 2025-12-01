
import React, { useState } from 'react';
import { Search, X, GripVertical, Info } from 'lucide-react';
import { AddOnDefinition, ADD_ON_LIBRARY } from '../../services/treatmentPlans';
import { FeeCategory, AddOnKind } from '../../types';

interface AddOnsLibraryPanelProps {
  onClose: () => void;
  feeScheduleType: 'standard' | 'membership';
  onDragStartAddOn?: (kind: AddOnKind) => void;
  onDragEndAddOn?: () => void;
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
  onDragEndAddOn
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
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'ADDON_TEMPLATE',
        ...addon
    }));
    onDragStartAddOn?.(addon.kind);
  };

  const handleDragEnd = () => {
    onDragEndAddOn?.();
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
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100 mb-2">
             <Info size={12} className="inline mr-1 -mt-0.5" />
             Drag items onto a procedure card to attach.
          </div>

          {filteredLibrary.map((addon) => (
             <div 
                key={addon.defaultCode}
                draggable
                onDragStart={e => handleDragStart(e, addon)}
                onDragEnd={handleDragEnd}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all group"
             >
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800 text-sm leading-tight">{addon.label}</span>
                    <GripVertical size={14} className="text-gray-300 group-hover:text-blue-400" />
                </div>
                <div className="text-xs text-gray-500 mb-2">{addon.description}</div>
                <div className="flex justify-between items-center border-t border-gray-50 pt-2">
                    <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">{addon.defaultCode}</code>
                    <span className="text-xs font-semibold text-gray-900">
                        ${(feeScheduleType === 'membership' && addon.membershipFee ? addon.membershipFee : addon.defaultFee).toFixed(0)}
                    </span>
                </div>
             </div>
          ))}

          {filteredLibrary.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                  No add-ons found.
              </div>
          )}
      </div>
    </div>
  );
};
