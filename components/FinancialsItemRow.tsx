import React, { useState, useEffect } from 'react';
import { TreatmentPlanItem } from '../types';
import { Check, X, Calculator } from 'lucide-react';
import { NumberPadModal } from './NumberPadModal';

interface FinancialsItemRowProps {
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  isAdvancedMode: boolean;
}

type ModalField = 'coveragePercent' | 'estInsurance' | 'estPatientPortion';

const formatNumberInput = (value: number | null | undefined): string => {
  if (value == null) return '';
  return String(value);
};

// Define sub-components OUTSIDE the main component to prevent re-creation on every render.
// This was the cause of the input focus loss issue.
const InputControl = ({ value, onChange, placeholder = "0.00", disabled = false, isPercentage = false }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled?: boolean, isPercentage?: boolean }) => (
  <div className="relative grow">
    <input 
      type="number"
      step="any"
      disabled={disabled}
      className={`w-full text-right bg-white border border-gray-200 rounded-md px-2 py-1.5 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed ${isPercentage ? 'pr-5' : 'pl-5'}`}
      value={disabled ? '' : value}
      onFocus={(e) => e.target.select()}
      onChange={onChange}
      placeholder={disabled ? '-' : placeholder}
    />
    <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none ${isPercentage ? 'right-2' : 'left-2'}`}>
      {isPercentage ? '%' : '$'}
    </span>
  </div>
);
  
const NumpadButton = ({ onClick, disabled = false }: { onClick: () => void, disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
    aria-label="Open number pad"
  >
    <Calculator size={16} />
  </button>
);


export const FinancialsItemRow: React.FC<FinancialsItemRowProps> = ({ item, onUpdate, isAdvancedMode }) => {
  const [coveragePercent, setCoveragePercent] = useState(formatNumberInput(item.coveragePercent));
  const [estInsurance, setEstInsurance] = useState(formatNumberInput(item.estimatedInsurance));
  const [estPatientPortion, setEstPatientPortion] = useState(formatNumberInput(item.estimatedPatientPortion));
  const [isDirty, setIsDirty] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    field: ModalField | null;
    title: string;
    isPercentage: boolean;
  }>({ isOpen: false, field: null, title: '', isPercentage: false });

  // Sync with parent prop changes only if not actively editing.
  // This is key to preventing the component from resetting during an edit.
  useEffect(() => {
    if (!isDirty) {
      setCoveragePercent(formatNumberInput(item.coveragePercent));
      setEstInsurance(formatNumberInput(item.estimatedInsurance));
      setEstPatientPortion(formatNumberInput(item.estimatedPatientPortion));
    }
  }, [item, isDirty]);

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentStr = e.target.value;
    setCoveragePercent(percentStr);
    setIsDirty(true);
    
    if (percentStr) {
      const percent = parseFloat(percentStr);
      if (!isNaN(percent) && percent >= 0 && percent <= 100) {
        const newIns = item.netFee * (percent / 100);
        setEstInsurance(newIns.toFixed(2));
        setEstPatientPortion((item.netFee - newIns).toFixed(2));
      }
    } else {
      setEstInsurance('0.00');
      setEstPatientPortion(String(item.netFee.toFixed(2)));
    }
  };

  const handleInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const insStr = e.target.value;
    setEstInsurance(insStr);
    setIsDirty(true);

    if (insStr && item.netFee > 0) {
      const ins = parseFloat(insStr);
      if (!isNaN(ins)) {
        const newPercent = (ins / item.netFee) * 100;
        setCoveragePercent(newPercent.toFixed(0));
        setEstPatientPortion((item.netFee - ins).toFixed(2));
      }
    } else {
      setCoveragePercent('0');
      setEstPatientPortion(String(item.netFee.toFixed(2)));
    }
  };

  const handlePatientPortionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ptStr = e.target.value;
    setEstPatientPortion(ptStr);
    setIsDirty(true);
    
    if (ptStr && item.netFee > 0) {
      const pt = parseFloat(ptStr);
      if (!isNaN(pt)) {
        const newIns = item.netFee - pt;
        setEstInsurance(newIns.toFixed(2));
        const newPercent = (newIns / item.netFee) * 100;
        setCoveragePercent(newPercent.toFixed(0));
      }
    } else {
       setCoveragePercent('100');
       setEstInsurance(String(item.netFee.toFixed(2)));
    }
  };

  const handleSave = () => {
    const parsedPercent = parseFloat(coveragePercent);
    const parsedInsurance = parseFloat(estInsurance);
    const parsedPatientPortion = parseFloat(estPatientPortion);

    const updates: Partial<TreatmentPlanItem> = {
      coveragePercent: !isNaN(parsedPercent) ? parsedPercent : null,
      estimatedInsurance: !isNaN(parsedInsurance) ? parsedInsurance : null,
      estimatedPatientPortion: !isNaN(parsedPatientPortion) ? parsedPatientPortion : null,
    };
    onUpdate(item.id, updates);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setCoveragePercent(formatNumberInput(item.coveragePercent));
    setEstInsurance(formatNumberInput(item.estimatedInsurance));
    setEstPatientPortion(formatNumberInput(item.estimatedPatientPortion));
    setIsDirty(false);
  };

  const handleModalDone = (newValue: string) => {
    const field = modalConfig.field;
    setModalConfig({ isOpen: false, field: null, title: '', isPercentage: false });
    setIsDirty(true);

    // Create a synthetic event to reuse existing change handlers
    const syntheticEvent = { target: { value: newValue } };

    if (field === 'coveragePercent') {
        handlePercentChange(syntheticEvent as any);
    } else if (field === 'estInsurance') {
        handleInsuranceChange(syntheticEvent as any);
    } else if (field === 'estPatientPortion') {
        handlePatientPortionChange(syntheticEvent as any);
    }
  };

  const getModalInitialValue = () => {
    if (modalConfig.field === 'coveragePercent') return coveragePercent;
    if (modalConfig.field === 'estInsurance') return estInsurance;
    if (modalConfig.field === 'estPatientPortion') return estPatientPortion;
    return '';
  };
  
  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
        {/* Procedure */}
        <td className="px-4 py-3 align-top">
          <div className="font-medium text-gray-900 text-sm">{item.procedureName}</div>
          <div className="text-xs text-gray-500 font-mono">{item.procedureCode}</div>
        </td>

        {/* Net Fee */}
        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 align-top pt-4">
          ${item.netFee.toFixed(2)}
        </td>
        
        {isAdvancedMode && (
          <>
            {/* Coverage % */}
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-1.5">
                <InputControl value={coveragePercent} onChange={handlePercentChange} placeholder="0" disabled={!isAdvancedMode} isPercentage />
                <NumpadButton disabled={!isAdvancedMode} onClick={() => setModalConfig({isOpen: true, field: 'coveragePercent', title: 'Coverage %', isPercentage: true})} />
              </div>
            </td>

            {/* Est. Insurance */}
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-1.5">
                <InputControl value={estInsurance} onChange={handleInsuranceChange} disabled={!isAdvancedMode} />
                <NumpadButton disabled={!isAdvancedMode} onClick={() => setModalConfig({isOpen: true, field: 'estInsurance', title: 'Est. Insurance', isPercentage: false})} />
              </div>
            </td>

            {/* Est. Pt Portion */}
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-1.5">
                <InputControl value={estPatientPortion} onChange={handlePatientPortionChange} disabled={!isAdvancedMode} />
                <NumpadButton disabled={!isAdvancedMode} onClick={() => setModalConfig({isOpen: true, field: 'estPatientPortion', title: 'Est. Patient Portion', isPercentage: false})} />
              </div>
            </td>
          </>
        )}
        
        {/* Actions */}
        <td className="px-4 py-3 align-middle">
          {isDirty && isAdvancedMode && (
            <div className="flex justify-start gap-1">
              <button onClick={handleSave} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-md" aria-label="Confirm changes"><Check size={16}/></button>
              <button onClick={handleCancel} className="p-1.5 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md" aria-label="Cancel changes"><X size={16}/></button>
            </div>
          )}
        </td>
      </tr>

      <NumberPadModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onDone={handleModalDone}
        initialValue={getModalInitialValue()}
        title={modalConfig.title}
        isPercentage={modalConfig.isPercentage}
      />
    </>
  );
};