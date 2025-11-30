







import React, { useState } from 'react';
import { DollarSign, Star, Info } from 'lucide-react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { getFeeSchedule } from '../../services/treatmentPlans';

interface PaymentEstimatorSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
}

export const PaymentEstimatorSection: React.FC<PaymentEstimatorSectionProps> = ({ plan, items }) => {
  const { totalFee, estimatedInsurance, patientPortion, clinicDiscount, membershipSavings } = plan;
  const insuranceEstimate = estimatedInsurance || 0;
  const discount = clinicDiscount || 0;
  const memberSave = membershipSavings || 0;
  
  const [term, setTerm] = useState(6); // Default 6 months

  const isMemberPricing = plan.feeScheduleType === 'membership';
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200 mb-8">
              <Star size={14} /> Member Pricing Applied
          </div>
        )}

        <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 md:p-8 mb-8">
           <div className="space-y-2">
              <div className="flex justify-between items-center font-medium text-gray-600">
                <span>Standard Treatment Fee</span>
                <span className="font-bold text-gray-900">${standardFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {memberSave > 0.005 && (
                <div className="flex justify-between items-center font-medium text-green-600">
                  <span>Membership Savings</span>
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
                <div className="flex justify-between items-center font-medium text-gray-600">
                  <span>Est. Insurance Coverage</span>
                  <span className="font-bold text-gray-900">-${insuranceEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
           </div>

           <hr className="border-gray-200 my-4" />

           {/* EMPHASIZED YOUR PORTION */}
           <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
               <div className="text-sm font-bold text-blue-800 uppercase tracking-wider">Your Estimated Portion</div>
               <div className="text-4xl font-extrabold text-blue-600 mt-1">
                   ${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
               </div>
               <p className="text-xs text-gray-500 mt-1">This is the amount you'll be responsible for. Payment options are below.</p>
           </div>
           
           <hr className="border-gray-200 my-8" />

           <h3 className="font-bold text-gray-900 mb-4">Choose Your Payment Plan</h3>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
             <button 
                onClick={() => setTerm(1)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  term === 1
                  ? 'border-blue-600 bg-white shadow-lg shadow-blue-100' 
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
                     ? 'border-blue-600 bg-white shadow-lg shadow-blue-100' 
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
                 <span className="font-bold text-gray-900 text-sm md:text-base">Or customize your plan</span>
                 <span className="text-[10px] md:text-xs font-bold uppercase text-gray-400">Use Custom</span>
               </div>
               
               <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  value={term} 
                  onChange={(e) => setTerm(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
               />
               
               <div className="flex justify-between text-xs text-gray-500 mb-8 font-medium">
                  <span>1 month</span>
                  <span className="text-gray-900 font-bold">{term} {term === 1 ? 'month' : 'months'}</span>
                  <span>24 months</span>
               </div>

               <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-3xl font-black text-blue-600 mb-1">
                    {term > 1 ? (
                        <>
                          ${(patientPortion / term).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          <span className="text-lg text-blue-500 font-semibold">/mo</span>
                        </>
                    ) : (
                        `$${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {term > 1 ? `for ${term} months = $${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 0 })} total` : 'Total payment today'}
                  </div>
               </div>
           </div>

        </div>
      </div>
    </section>
  );
};