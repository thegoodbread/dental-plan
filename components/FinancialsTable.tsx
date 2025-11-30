import React from 'react';
import { TreatmentPlan, TreatmentPlanItem, InsuranceMode } from '../types';
import { FinancialsItemRow } from './FinancialsItemRow';
import { Calculator, CheckCircle, Info } from 'lucide-react';
import { FinancialsMobileCard } from './FinancialsMobileCard';

interface FinancialsTableProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  onUpdateItem: (id: string, updates: Partial<TreatmentPlanItem>) => void;
  saveStatus: 'IDLE' | 'SAVED';
  insuranceMode: InsuranceMode;
}

export const FinancialsTable: React.FC<FinancialsTableProps> = ({
  plan, items, onUpdateItem, saveStatus, insuranceMode
}) => {
  const isAdvancedMode = insuranceMode === 'advanced';
  const isMembership = plan.feeScheduleType === 'membership';
  const standardTotal = plan.totalFee + (plan.membershipSavings || 0);
  const insurance = plan.estimatedInsurance || 0;
  const discount = plan.clinicDiscount || 0;
  
  const emptyState = (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
            <Calculator size={24} />
          </div>
          <p className="text-gray-500 font-medium">No procedures in this plan.</p>
          <p className="text-sm text-gray-400">Add procedures in the Clinical view first.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white md:rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative rounded-lg">
      {isAdvancedMode && items.length > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>Enter coverage % or estimated insurance per procedure. Plan totals and the Est. Benefit in the sidebar will be calculated automatically.</p>
        </div>
      )}
      
      {items.length === 0 ? emptyState : (
        <>
          {/* DESKTOP TABLE VIEW (LG screens and up) */}
          <div className="hidden lg:block overflow-x-auto flex-1 relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3 w-1/3 bg-gray-50">Procedure</th>
                  <th className="px-4 py-3 text-right w-28 bg-gray-50">Net Fee</th>
                  {isAdvancedMode && (
                    <>
                      <th className="px-4 py-3 text-right w-32 bg-gray-50">Coverage %</th>
                      <th className="px-4 py-3 text-right w-36 bg-gray-50">Est. Insurance</th>
                      <th className="px-4 py-3 text-right w-36 bg-gray-50">Est. Pt Portion</th>
                    </>
                  )}
                  <th className="px-4 py-3 w-24 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map(item => (
                  <FinancialsItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    isAdvancedMode={isAdvancedMode}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE & TABLET CARD VIEW (Screens smaller than LG) */}
          <div className="lg:hidden p-2 space-y-2 flex-1 overflow-y-auto bg-gray-50">
            {items.map(item => (
              <FinancialsMobileCard
                key={item.id}
                item={item}
                onUpdate={onUpdateItem}
                isAdvancedMode={isAdvancedMode}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-0 z-20 md:relative">
        <div className="h-6 w-full md:w-auto md:shrink-0">
          {saveStatus === 'SAVED' && (
            <div className="text-green-600 text-xs font-medium flex items-center gap-1 animate-in fade-in duration-300">
              <CheckCircle size={14} /> All changes saved.
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-wrap justify-between md:justify-end w-full md:gap-3 lg:gap-4 items-center">
          {isMembership && (
            <>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">Standard</span>
                <span className="text-base md:text-lg lg:text-xl font-bold text-gray-500 line-through">
                  ${standardTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
            </>
          )}

          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs text-gray-500 uppercase font-semibold">{isMembership ? 'Member Fee' : 'Total Fee'}</span>
            <span className="text-base md:text-lg lg:text-xl font-bold text-gray-900">${plan.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          {insurance > 0.005 && (
            <>
              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
              <div className="flex flex-col items-center md:items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">Est. Insurance</span>
                <span className="text-base md:text-lg lg:text-xl font-bold text-green-600">-${insurance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          {discount > 0.005 && (
            <>
              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
              <div className="flex flex-col items-center md:items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">Discount</span>
                <span className="text-base md:text-lg lg:text-xl font-bold text-green-600">-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          
          <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
          
          <div className="flex flex-col items-end">
             <span className="text-xs text-gray-500 uppercase font-semibold">Pt Portion</span>
             <span className="text-base md:text-lg lg:text-xl font-bold text-blue-600">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};