import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { TreatmentPlan } from '../../types';

interface PaymentEstimatorSectionProps {
  plan: TreatmentPlan;
}

export const PaymentEstimatorSection: React.FC<PaymentEstimatorSectionProps> = ({ plan }) => {
  const { totalFee: subtotal, estimatedInsurance, patientPortion } = plan;
  const insuranceEstimate = estimatedInsurance || 0;

  const discount = Math.max(0, subtotal - insuranceEstimate - patientPortion);
  const totalAfterDiscount = subtotal - discount;
  
  const [term, setTerm] = useState(6); // Default 6 months

  const insurancePercentage = totalAfterDiscount > 0 ? (insuranceEstimate / totalAfterDiscount) * 100 : 0;

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-500" />
            <h2 className="font-bold text-xl text-gray-900">How Much It Costs</h2>
        </div>
        <p className="text-gray-500 mb-8 md:mb-10">Transparent pricing with flexible payment options</p>

        <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 md:p-8 mb-8">
           
           {discount > 0.005 ? (
             <>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center font-medium text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center font-medium text-green-600">
                  <span>Discount</span>
                  <span className="font-bold">-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <hr className="border-gray-200 mb-4" />
              <div className="flex justify-between items-center mb-2 font-medium text-gray-600">
                <span>Total Treatment Cost</span>
                <span className="font-bold text-gray-900 text-lg">${totalAfterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
             </>
           ) : (
            <div className="flex justify-between items-center mb-2 font-medium text-gray-600">
             <span>Total Treatment Cost</span>
             <span className="font-bold text-gray-900 text-lg">${totalAfterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
           </div>
           )}
           
           {/* Visual Bar */}
           <div className="h-4 w-full bg-blue-200 rounded-full overflow-hidden flex mb-3">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${insurancePercentage}%` }} title="Insurance"></div>
              {/* The blue part is implicit */}
           </div>
           
           <div className="flex flex-col sm:flex-row justify-between text-xs font-medium mb-8 gap-2">
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-green-500 rounded-full shrink-0"></span>
                 Insurance Estimate: ${insuranceEstimate.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-blue-500 rounded-full shrink-0"></span>
                 Your Portion: ${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
           </div>

           <hr className="border-gray-200 mb-8" />

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
