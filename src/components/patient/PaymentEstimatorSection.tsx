
import React, { useState, useEffect } from 'react';
import { DollarSign, Star } from 'lucide-react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { VisualCostBreakdownBar } from './VisualCostBreakdownBar';

interface PaymentEstimatorSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
}

export const PaymentEstimatorSection: React.FC<PaymentEstimatorSectionProps> = ({ plan, items }) => {
  // Temporary debug log to verify data flow
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PaymentEstimator Plan:', plan);
    }
  }, [plan]);

  const { totalFee, estimatedInsurance, patientPortion, clinicDiscount, membershipSavings } = plan;
  const insuranceEstimate = estimatedInsurance || 0;
  const discount = clinicDiscount || 0;
  const memberSave = membershipSavings || 0;
  
  const [term, setTerm] = useState(6); // Default 6 months

  const isMemberPricing = plan.feeScheduleType === 'membership';
  // If membership pricing is active, the 'totalFee' is the member rate. 
  // The 'Standard' rate is Total + Savings.
  const standardFee = totalFee + memberSave;

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-500" />
            <h2 className="font-bold text-xl text-gray-900">How Much It Costs</h2>
        </div>
        <p className="text-gray-500 mb-8 md:mb-10">Transparent pricing with flexible payment options</p>
        
        {isMemberPricing && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200 mb-8 animate-in fade-in slide-in-from-left-2">
              <Star size={14} fill="currentColor" /> Member Pricing Applied
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl md:rounded-3xl border border-gray-200 p-6 md:p-8 mb-8">
           <div className="space-y-3">
              <div className="flex justify-between items-center font-medium text-gray-600">
                <span>Standard Treatment Fee</span>
                <span className={`font-bold text-gray-900 ${memberSave > 0 ? 'line-through text-gray-400' : ''}`}>
                    ${standardFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {memberSave > 0.005 && (
                <div className="flex justify-between items-center font-medium text-teal-600 bg-teal-50/50 p-2 rounded-lg border border-teal-100/50">
                  <span className="flex items-center gap-2"><Star size={14}/> Membership Savings</span>
                  <span className="font-bold">-${memberSave.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {discount > 0.005 && (
                <div className="flex justify-between items-center font-medium text-green-600">
                  <span>Clinic Savings</span>
                  <span className="font-bold">-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              {insuranceEstimate > 0.005 && (
                <div className="flex justify-between items-center font-medium text-blue-600">
                  <span>Est. Insurance Coverage</span>
                  <span className="font-bold">-${insuranceEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
           </div>

           <VisualCostBreakdownBar
                totalFee={standardFee}
                membershipSavings={memberSave}
                clinicSavings={discount}
                insuranceCoverage={insuranceEstimate}
                patientPortion={patientPortion}
            />

           {/* EMPHASIZED YOUR PORTION */}
           <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm mt-6">
               <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Your Estimated Portion</div>
               <div className="text-5xl font-black text-gray-900 tracking-tight">
                   ${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
               </div>
               <p className="text-xs text-gray-400 mt-2">Does not include potential third-party financing fees.</p>
           </div>
           
           <div className="mt-12">
               <h3 className="font-bold text-gray-900 mb-6 text-center">Payment Options</h3>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                 <button 
                    onClick={() => setTerm(1)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      term === 1
                      ? 'border-blue-600 bg-white shadow-lg shadow-blue-100 ring-1 ring-blue-600' 
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-[10px] md:text-xs font-bold uppercase text-gray-400 mb-1">Pay Today</div>
                    <div className="text-sm font-bold text-gray-900">In Full</div>
                 </button>
                 {[3, 6, 12].map(m => (
                    <button 
                      key={m}
                      onClick={() => setTerm(m)}
                      className={`p-3 md:p-4 rounded-xl border-2 text-center transition-all ${
                         term === m 
                         ? 'border-blue-600 bg-white shadow-lg shadow-blue-100 ring-1 ring-blue-600' 
                         : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                       <div className="text-[10px] md:text-xs font-bold uppercase text-gray-400 mb-1">{m} Months</div>
                       <div className="text-sm font-bold text-gray-900">${(patientPortion / m).toFixed(0)}/mo</div>
                    </button>
                 ))}
               </div>

               {/* Interactive Slider Area */}
               <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200">
                   <div className="flex justify-between items-center mb-6">
                     <span className="font-bold text-gray-900 text-sm md:text-base">Custom Monthly Plan</span>
                     <span className="text-[10px] md:text-xs font-bold uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded">Adjust Term</span>
                   </div>
                   
                   <input 
                      type="range" 
                      min="1" 
                      max="24" 
                      value={term} 
                      onChange={(e) => setTerm(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
                   />
                   
                   <div className="flex justify-between text-xs text-gray-400 mb-8 font-medium">
                      <span>1 mo</span>
                      <span className="text-blue-600 font-bold">{term} months</span>
                      <span>24 mo</span>
                   </div>

                   <div className="bg-blue-50 rounded-xl p-6 text-center border border-blue-100">
                      <div className="text-3xl font-black text-blue-600 mb-1 flex items-baseline justify-center gap-1">
                        {term > 1 ? (
                            <>
                              ${(patientPortion / term).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              <span className="text-base text-blue-400 font-bold">/mo</span>
                            </>
                        ) : (
                            `$${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        )}
                      </div>
                      <div className="text-xs text-blue-400 font-medium">
                        {term > 1 ? `Total: $${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 0 })} over ${term} months` : 'Single payment'}
                      </div>
                   </div>
               </div>
           </div>

        </div>
      </div>
    </section>
  );
};
