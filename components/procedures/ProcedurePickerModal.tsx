import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Clock, Command } from 'lucide-react';
import { FeeScheduleEntry, FeeCategory } from '../../types';
import { getFeeSchedule } from '../../services/treatmentPlans';
import { getProcedureIcon } from '../../utils/getProcedureIcon';

interface ProcedurePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entry: FeeScheduleEntry) => void;
}

const CATEGORIES: FeeCategory[] = [
  'DIAGNOSTIC', 'PREVENTIVE', 'RESTORATIVE', 'ENDODONTIC', 
  'PERIO', 'IMPLANT', 'PROSTHETIC', 'ORTHO', 'COSMETIC', 'OTHER'
];

const RECENT_KEY = 'dental_recent_codes';

export const ProcedurePickerModal: React.FC<ProcedurePickerModalProps> = ({ 
  isOpen, onClose, onSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | 'ALL'>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load Library & Recents
  const library = useMemo(() => getFeeSchedule(), []);
  
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) {
      try {
        setRecentCodes(JSON.parse(saved));
      } catch (e) { console.error("Failed to load recents", e); }
    }
  }, []);

  // Filter Logic
  const filteredItems = useMemo(() => {
    let items = library.filter(item => item.isActive);

    // 1. Category Filter
    if (selectedCategory !== 'ALL') {
      items = items.filter(i => i.category === selectedCategory);
    }

    // 2. Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i => 
        i.procedureCode.toLowerCase().includes(term) ||
        i.procedureName.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term)
      );
      
      // Sort by relevance
      items.sort((a, b) => {
        const aCodeMatch = a.procedureCode.toLowerCase().startsWith(term);
        const bCodeMatch = b.procedureCode.toLowerCase().startsWith(term);
        if (aCodeMatch && !bCodeMatch) return -1;
        if (!aCodeMatch && bCodeMatch) return 1;
        return 0;
      });
    }

    return items;
  }, [library, searchTerm, selectedCategory]);

  // Recents Logic (Get full objects)
  const recentItems = useMemo(() => {
    if (searchTerm || selectedCategory !== 'ALL') return [];
    return recentCodes
      .map(code => library.find(i => i.procedureCode === code))
      .filter((item): item is FeeScheduleEntry => !!item);
  }, [recentCodes, library, searchTerm, selectedCategory]);

  // Combined display list (Recents + Filtered)
  const displayList = useMemo(() => {
    if (searchTerm || selectedCategory !== 'ALL') return filteredItems;
    const recentIds = new Set(recentItems.map(r => r.id));
    const others = filteredItems.filter(i => !recentIds.has(i.id));
    return [...recentItems, ...others];
  }, [filteredItems, recentItems, searchTerm, selectedCategory]);

  // Reset highlight on filter change
  useEffect(() => {
    setHighlightedIndex(0);
    listRef.current?.scrollTo(0,0);
  }, [searchTerm, selectedCategory]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, displayList.length - 1));
        scrollIntoView(highlightedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        scrollIntoView(highlightedIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayList[highlightedIndex]) {
          handleSelect(displayList[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayList, highlightedIndex]);

  const scrollIntoView = (index: number) => {
    const el = document.getElementById(`proc-item-${index}`);
    el?.scrollIntoView({ block: 'nearest' });
  };

  const handleSelect = (item: FeeScheduleEntry) => {
    const newRecents = [item.procedureCode, ...recentCodes.filter(c => c !== item.procedureCode)].slice(0, 8);
    setRecentCodes(newRecents);
    localStorage.setItem(RECENT_KEY, JSON.stringify(newRecents));
    
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end md:items-start justify-center pt-0 md:pt-[10vh] px-0 md:px-4 pb-0 md:pb-4">
      <div 
        className="bg-white w-full md:max-w-4xl h-[90vh] md:h-auto md:max-h-[80vh] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:fade-in md:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white sticky top-0 z-20">
          <Search className="text-gray-400" size={24} />
          <input
            ref={searchInputRef}
            type="text"
            className="flex-1 text-lg md:text-xl outline-none placeholder:text-gray-400 font-medium bg-transparent text-gray-900"
            placeholder="Search procedures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 bg-gray-50 md:bg-transparent">
             <X size={20} />
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap gap-2 shrink-0 backdrop-blur-sm max-h-32 overflow-y-auto">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === 'ALL' 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600'
              }`}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-0 scroll-smooth pb-8"
        >
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p>No procedures found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayList.map((item, idx) => {
                const Icon = getProcedureIcon(item);
                const isSelected = idx === highlightedIndex;
                const isRecent = !searchTerm && selectedCategory === 'ALL' && idx < recentItems.length;

                return (
                  <div
                    key={item.id}
                    id={`proc-item-${idx}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`
                      px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer transition-colors active:bg-blue-50
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                        ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                      `}>
                        <Icon width={20} height={20} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {item.procedureName}
                          </span>
                          {isRecent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              <Clock size={10} /> Recent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                            {item.procedureCode}
                          </code>
                          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`font-mono font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                      ${item.baseFee.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};