import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPlanByShareToken } from '../services/treatmentPlans';
import { TreatmentPlan, TreatmentPlanItem } from '../types';
import { Phone, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export const PatientPlanPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ plan: TreatmentPlan, items: TreatmentPlanItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const result = getPlanByShareToken(token);
      setData(result);
      setLoading(false);
    }
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="text-gray-400 mb-4 flex justify-center"><AlertCircle size={48} /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
        <p className="text-gray-600">This treatment plan link may have expired or is invalid.</p>
      </div>
    </div>
  );

  const { plan, items } = data;
  const isAccepted = plan.status === 'ACCEPTED';
  const isDeclined = plan.status === 'DECLINED';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Brand Header */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">D</div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">DentalPlan Clinic</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4 md:p-8">
        
        {/* Status Messages */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-green-800 animate-in slide-in-from-top-4">
            <CheckCircle className="shrink-0" />
            <span className="font-medium">Plan Accepted! We look forward to seeing you.</span>
          </div>
        )}
        
        {isDeclined && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-gray-600">
            <AlertCircle className="shrink-0" />
            <span className="font-medium">This plan is no longer active.</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Welcome & Explanation */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Hi {plan.patient?.firstName},
            </h1>
            <p className="text-gray-500 mb-6">
              Here is the treatment plan we prepared for <strong>{plan.title}</strong>.
            </p>
            
            {plan.explanationForPatient && (
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-blue-900 leading-relaxed">
                    <p>{plan.explanationForPatient}</p>
                </div>
            )}
          </div>

          {/* Procedures List */}
          <div className="p-6 md:p-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Procedures</h2>
            <div className="space-y-4">
              {items.map((item, idx) => {
                 let location = '';
                 if (item.selectedTeeth?.length) location = `Tooth: ${item.selectedTeeth.join(', ')}`;
                 else if (item.selectedQuadrants?.length) location = `Quad: ${item.selectedQuadrants.join(', ')}`;
                 else if (item.selectedArches?.length) location = `Arch: ${item.selectedArches.join(', ')}`;
                 
                 return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-start justify-between py-4 border-b border-gray-50 last:border-0">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{item.procedureName}</div>
                          {location && <div className="text-sm text-gray-500 mt-1">{location}</div>}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 font-medium text-gray-900 pl-12 sm:pl-0">
                        ${item.netFee.toLocaleString()}
                      </div>
                    </div>
                 );
              })}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-200">
            <div className="flex flex-col gap-3">
               <div className="flex justify-between text-gray-500">
                 <span>Total Treatment Fee</span>
                 <span>${plan.totalFee.toLocaleString()}</span>
               </div>
               {(plan.estimatedInsurance || 0) > 0 && (
                 <div className="flex justify-between text-green-600">
                   <span>Estimated Insurance</span>
                   <span>- ${(plan.estimatedInsurance || 0).toLocaleString()}</span>
                 </div>
               )}
               <div className="border-t border-gray-200 my-2"></div>
               <div className="flex justify-between items-center">
                 <span className="text-lg font-bold text-gray-900">Your Estimated Portion</span>
                 <span className="text-2xl font-bold text-blue-600">${plan.patientPortion.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {!isAccepted && !isDeclined && (
          <div className="mt-8 text-center space-y-4">
            <p className="text-gray-500">Questions? Ready to schedule?</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a href="tel:5551234567" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Phone size={20} />
                Call to Schedule
              </a>
              <button className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-8 py-3 rounded-xl font-bold transition-all">
                <Calendar size={20} />
                Book Online
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
