
import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

interface PaymentEstimatorSectionProps {
  totalFee: number;
  insuranceEstimate: number;
}

export const PaymentEstimatorSection: React.FC<PaymentEstimatorSectionProps> = ({ totalFee, insuranceEstimate }) => {
  const patientPortion = totalFee - insuranceEstimate;
  const [term, setTerm] = useState(6); // Default 6 months

  const monthlyPayment = patientPortion / term;

  return (
    <section className="py-16 px-6 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-500" />
            <h2 className="font-bold text-xl text-gray-900">How Much It Costs</h2>
        </div>
        <p className="text-gray-500 mb-10">Transparent pricing with flexible payment options</p>

        <div className="bg-gray-50 rounded-3xl border border-gray-200 p-8 mb-8">
           <div className="flex justify-between items-center mb-2 font-medium text-gray-600">
             <span>Total Treatment Cost</span>
             <span className="font-bold text-gray-900">${totalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
           </div>
           
           {/* Visual Bar */}
           <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden flex mb-3">
              <div className="h-full bg-green-500 w-[15%]" title="Insurance"></div>
              <div className="h-full bg-blue-500 w-[85%]" title="You"></div>
           </div>
           
           <div className="flex justify-between text-xs font-medium mb-8">
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                 Insurance: ${insuranceEstimate.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                 Your Portion: ${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
           </div>

           <hr className="border-gray-200 mb-8" />

           <h3 className="font-bold text-gray-900 mb-4">Choose Your Payment Plan</h3>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <button className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold text-center">
                Pay in Full
             </button>
             {[3, 6, 12].map(m => (
                <button 
                  key={m}
                  onClick={() => setTerm(m)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                     term === m 
                     ? 'border-blue-600 bg-white shadow-lg shadow-blue-100' 
                     : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                   <div className="text-xs font-bold uppercase text-gray-400 mb-1">{m} Months</div>
                   <div className="text-sm font-bold text-gray-900">${(patientPortion / m).toFixed(2)}/mo</div>
                </button>
             ))}
           </div>

           {/* Interactive Slider Area */}
           <div className="bg-white rounded-2xl p-6 border border-gray-200">
               <div className="flex justify-between items-center mb-6">
                 <span className="font-bold text-gray-900">Or customize your plan</span>
                 <span className="text-xs font-bold uppercase text-gray-400">Use Custom</span>
               </div>
               
               <input 
                  type="range" 
                  min="3" 
                  max="24" 
                  value={term} 
                  onChange={(e) => setTerm(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
               />
               
               <div className="flex justify-between text-xs text-gray-500 mb-8 font-medium">
                  <span>3 months</span>
                  <span className="text-gray-900 font-bold">{term} months</span>
                  <span>24 months</span>
               </div>

               <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-3xl font-black text-blue-600 mb-1">
                    ${(patientPortion / term).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    <span className="text-lg text-blue-500 font-semibold">/month</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    for {term} months = ${patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })} total
                  </div>
               </div>
           </div>

        </div>
      </div>
    </section>
  );
};
