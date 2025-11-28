import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPlanByToken } from '../services/api';
import { TreatmentPlan, PlanStatus } from '../types';
import { Phone, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export const PatientView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getPlanByToken(token).then(p => {
        setPlan(p);
        setLoading(false);
      });
    }
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-blue-600 rounded-lg mb-4"></div>
        <div className="text-gray-400 font-medium">Loading your plan...</div>
      </div>
    </div>
  );

  if (!plan) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm">
        <div className="text-red-500 mb-4 flex justify-center"><AlertCircle size={48} /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h1>
        <p className="text-gray-600">This treatment plan link is no longer active. Please contact the clinic for a new link.</p>
      </div>
    </div>
  );

  const isAccepted = plan.status === PlanStatus.ACCEPTED;
  const isDeclined = plan.status === PlanStatus.DECLINED;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Clinic Header */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            D
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">DentalPlan Clinic</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4 md:p-8">
        
        {/* Status Banners */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-green-800">
            <CheckCircle className="shrink-0" />
            <span className="font-medium">You have accepted this treatment plan. We look forward to seeing you!</span>
          </div>
        )}
        
        {isDeclined && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-gray-600">
            <AlertCircle className="shrink-0" />
            <span className="font-medium">This plan has been declined and is no longer active.</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Welcome Section */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Hi {plan.patient?.first_name},</h1>
            <p className="text-gray-600 leading-relaxed">
              Here is the breakdown of the treatment plan we discussed for <strong>{plan.title}</strong>. 
              Please review the details below.
            </p>
            <div className="mt-4 inline-flex items-center text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              Plan #{plan.plan_number} • Issued {new Date(plan.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Procedures */}
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Treatment Details</h2>
            <div className="space-y-4">
              {plan.items.map((item, idx) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-start justify-between py-4 border-b border-gray-100 last:border-0">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{item.procedure_name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Tooth: {item.tooth || 'General'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 font-medium text-gray-900 pl-12 sm:pl-0">
                    ${item.fee.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-gray-50 p-6 md:p-8">
            <div className="flex flex-col gap-3">
               <div className="flex justify-between text-gray-500">
                 <span>Total Treatment Fee</span>
                 <span>${plan.total_fee.toLocaleString()}</span>
               </div>
               {plan.estimated_insurance > 0 && (
                 <div className="flex justify-between text-green-600">
                   <span>Estimated Insurance Benefit</span>
                   <span>- ${plan.estimated_insurance.toLocaleString()}</span>
                 </div>
               )}
               <div className="border-t border-gray-200 my-2"></div>
               <div className="flex justify-between items-center">
                 <span className="text-lg font-bold text-gray-900">Your Estimated Portion</span>
                 <span className="text-2xl font-bold text-blue-600">${plan.patient_portion.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {!isAccepted && !isDeclined && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-6">Ready to proceed or have questions?</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="tel:555-0123" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Phone size={20} />
                Call to Book Appointment
              </a>
              <button className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-8 py-3 rounded-xl font-bold transition-all">
                <Calendar size={20} />
                Request Online
              </button>
            </div>
          </div>
        )}

      </main>
      
      <footer className="py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} DentalPlan Clinic. All rights reserved.
      </footer>
    </div>
  );
};