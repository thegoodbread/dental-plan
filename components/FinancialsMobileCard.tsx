
import React, { useState, useEffect } from 'react';
import { TreatmentPlanItem } from '../types';
import { Check, X, Calculator } from 'lucide-react';
import { NumberPadModal } from './NumberPadModal';

interface FinancialsMobileCardProps {
  item: TreatmentPlanItem;
  onUpdate: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  isAdvancedMode: boolean;
}

type ModalField = 'coveragePercent' | 'estInsurance' | 'estPatientPortion';

const formatNumberInput = (value: number | null | undefined): string => {
  if (value == null) return '';
  return String(value);
};

// Sub-components are defined outside the main component to prevent re-renders,
// which previously caused input focus issues.
const InputControl = ({ value, onChange, placeholder = "0", isPercentage = false }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, isPercentage?: boolean }) => (
  <div className="relative grow">
    <input 
      type="number"
      step="any"
      className={`w-full text-right bg-white border border-gray-300 rounded-lg px-2 py-2 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 ${isPercentage ? 'pr-5' : 'pl-5'}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
    <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none ${isPercentage ? 'right-2.5' : 'left-2.5'}`}>
      {isPercentage ? '%' : '$'}
    </span>
  </div>
);
  
const NumpadButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-2.5 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg border border-gray-300"
    aria-label="Open number pad"
  >
    <Calculator size={18} />
  </button>
);

export const FinancialsMobileCard: React.FC<FinancialsMobileCardProps> = ({ item, onUpdate, isAdvancedMode }) => {
  // State management and handlers are copied from the desktop row component
  // to keep logic consistent while providing a different layout.
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
    const updates: Partial<TreatmentPlanItem> = {
      coveragePercent: parseFloat(coveragePercent) || null,
      estimatedInsurance: parseFloat(estInsurance) || null,
      estimatedPatientPortion: parseFloat(estPatientPortion) || null,
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
    const syntheticEvent = { target: { value: newValue } };

    if (field === 'coveragePercent') handlePercentChange(syntheticEvent as any);
    else if (field === 'estInsurance') handleInsuranceChange(syntheticEvent as any);
    else if (field === 'estPatientPortion') handlePatientPortionChange(syntheticEvent as any);
  };

  const getModalInitialValue = () => {
    if (modalConfig.field === 'coveragePercent') return coveragePercent;
    if (modalConfig.field === 'estInsurance') return estInsurance;
    if (modalConfig.field === 'estPatientPortion') return estPatientPortion;
    return '';
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.procedureName}</h4>
            <div className="text-xs text-gray-500 font-mono mt-1">{item.procedureCode}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900">${item.netFee.toFixed(2)}</div>
            <div className="text-xs text-gray-400">Net Fee</div>
          </div>
        </div>

        {isAdvancedMode && (
          <div className="space-y-3 pt-3 mt-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-600">Coverage</label>
              <div className="flex items-center gap-1.5 w-1/2">
                <InputControl value={coveragePercent} onChange={handlePercentChange} isPercentage />
                <NumpadButton onClick={() => setModalConfig({isOpen: true, field: 'coveragePercent', title: 'Coverage %', isPercentage: true})} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-600">Est. Insurance</label>
              <div className="flex items-center gap-1.5 w-1/2">
                <InputControl value={estInsurance} onChange={handleInsuranceChange} />
                <NumpadButton onClick={() => setModalConfig({isOpen: true, field: 'estInsurance', title: 'Est. Insurance', isPercentage: false})} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-600">Est. Pt Portion</label>
              <div className="flex items-center gap-1.5 w-1/2">
                <InputControl value={estPatientPortion} onChange={handlePatientPortionChange} />
                <NumpadButton onClick={() => setModalConfig({isOpen: true, field: 'estPatientPortion', title: 'Est. Patient Portion', isPercentage: false})} />
              </div>
            </div>
          </div>
        )}

        {isDirty && isAdvancedMode && (
          <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
            <button onClick={handleCancel} className="flex-1 py-2 text-xs bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 py-2 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
              Save
            </button>
          </div>
        )}
      </div>

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
