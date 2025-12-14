
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Plus, Star } from 'lucide-react';

interface Icd10Option {
  code: string;
  label: string;
  relatedCdtCodes?: string[];
}

// Common dental ICD-10 codes for demo purposes
const COMMON_DENTAL_ICD10_CODES: Icd10Option[] = [
  { code: "K02.9", label: "Dental caries, unspecified", relatedCdtCodes: ["D2391", "D2392", "D2393", "D2394", "D2740"] },
  { code: "K02.52", label: "Dental caries on pit and fissure surface penetrating into dentin", relatedCdtCodes: ["D2391", "D2392"] },
  { code: "K02.62", label: "Dental caries on smooth surface penetrating into dentin", relatedCdtCodes: ["D2391", "D2392", "D2393"] },
  { code: "K04.0", label: "Pulpitis", relatedCdtCodes: ["D3310", "D3320", "D3330", "D3220"] },
  { code: "K04.1", label: "Necrosis of pulp", relatedCdtCodes: ["D3310", "D3320", "D3330"] },
  { code: "K04.7", label: "Periapical abscess without sinus", relatedCdtCodes: ["D3310", "D3320", "D3330", "D7140"] },
  { code: "K05.10", label: "Chronic gingivitis, plaque induced", relatedCdtCodes: ["D1110", "D4341", "D4342"] },
  { code: "K05.32", label: "Chronic generalized periodontitis", relatedCdtCodes: ["D4341", "D4342", "D4910"] },
  { code: "K08.109", label: "Complete loss of teeth, unspecified cause", relatedCdtCodes: ["D5110", "D5120", "D6010"] },
  { code: "K08.419", label: "Partial loss of teeth, unspecified cause", relatedCdtCodes: ["D5213", "D5214", "D6240", "D6010"] },
  { code: "K03.81", label: "Cracked tooth", relatedCdtCodes: ["D2740", "D2750", "D2790"] },
  { code: "K08.89", label: "Other specified disorders of teeth and supporting structures", relatedCdtCodes: ["D2950"] },
  { code: "Z98.811", label: "Dental sealant status", relatedCdtCodes: [] },
  { code: "Z45.2", label: "Encounter for adjustment and management of vascular access device (Implant)", relatedCdtCodes: ["D6057", "D6010"] },
];

interface DiagnosisCodePickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  procedureCode: string;
  procedureName: string;
}

export const DiagnosisCodePicker: React.FC<DiagnosisCodePickerProps> = ({
  value,
  onChange,
  procedureCode,
  procedureName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleRemove = (codeToRemove: string) => {
    onChange(value.filter(code => code !== codeToRemove));
  };

  const handleAdd = (codeToAdd: string) => {
    if (!value.includes(codeToAdd)) {
      onChange([...value, codeToAdd]);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return COMMON_DENTAL_ICD10_CODES.filter(option => 
      !value.includes(option.code) && // Exclude already selected
      (option.code.toLowerCase().includes(term) || option.label.toLowerCase().includes(term))
    );
  }, [searchTerm, value]);

  const recommendedOptions = useMemo(() => {
    if (searchTerm) return []; // Only show recommendations when not searching
    return filteredOptions.filter(opt => 
      opt.relatedCdtCodes?.some(code => procedureCode.startsWith(code) || code === procedureCode)
    );
  }, [filteredOptions, procedureCode, searchTerm]);

  // If we have recommendations, exclude them from the general list to avoid dupes visually (optional style choice)
  // For simplicity, we'll keep the general list as "All Matches" if searching, or "Other Codes" if browsing.
  const otherOptions = useMemo(() => {
    if (searchTerm) return filteredOptions;
    const recCodes = new Set(recommendedOptions.map(r => r.code));
    return filteredOptions.filter(o => !recCodes.has(o.code));
  }, [filteredOptions, recommendedOptions, searchTerm]);

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Chips Display */}
      <div className="flex flex-wrap gap-2 min-h-[38px] p-1.5 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        {value.map(code => (
          <span key={code} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 animate-in fade-in zoom-in duration-100">
            {code}
            <button 
              onClick={(e) => { e.stopPropagation(); handleRemove(code); }}
              className="text-blue-400 hover:text-blue-600 rounded-full p-0.5 hover:bg-blue-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        
        <button
          onClick={() => setIsOpen(true)}
          className={`text-sm text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1 transition-colors ${value.length === 0 ? 'font-medium' : ''}`}
        >
          <Plus size={14} />
          {value.length === 0 ? 'Add Diagnosis' : 'Add'}
        </button>
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150 max-h-80">
          
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Search code or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {/* Recommended Section */}
            {recommendedOptions.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  Recommended for {procedureCode}
                </div>
                {recommendedOptions.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => handleAdd(opt.code)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-md text-sm group transition-colors"
                  >
                    <div className="font-bold text-gray-800 group-hover:text-blue-700">{opt.code}</div>
                    <div className="text-xs text-gray-500 group-hover:text-blue-600 truncate">{opt.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Other Results */}
            {otherOptions.length > 0 && (
              <div>
                {recommendedOptions.length > 0 && (
                   <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 mt-1 pt-2">
                     Other Codes
                   </div>
                )}
                {otherOptions.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => handleAdd(opt.code)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm group transition-colors"
                  >
                    <div className="font-bold text-gray-800">{opt.code}</div>
                    <div className="text-xs text-gray-500 truncate">{opt.label}</div>
                  </button>
                ))}
              </div>
            )}

            {recommendedOptions.length === 0 && otherOptions.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400 italic">
                No matching codes found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
