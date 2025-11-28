import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Share2, Printer, CheckCircle, XCircle, 
  Clock, Activity, Sparkles, AlertCircle 
} from 'lucide-react';
import { getPlanById, updatePlanStatus, createShareLink, getActivityLogs } from '../services/api';
import { generatePatientFriendlySummary } from '../services/geminiService';
import { TreatmentPlan, PlanStatus, ActivityLog } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

export const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (planId: string) => {
    setLoading(true);
    const [p, acts] = await Promise.all([
      getPlanById(planId),
      getActivityLogs(planId)
    ]);
    setPlan(p);
    setActivities(acts);
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: PlanStatus) => {
    if (!plan) return;
    const updated = await updatePlanStatus(plan.id, newStatus);
    setPlan(updated);
    const acts = await getActivityLogs(plan.id);
    setActivities(acts);
  };

  const handleShare = async () => {
    if (!plan) return;
    const token = await createShareLink(plan.id);
    const url = `${window.location.origin}/#/p/${token}`;
    setShareUrl(url);
  };

  const handleAiSummary = async () => {
    if (!plan) return;
    setGeneratingAi(true);
    const summary = await generatePatientFriendlySummary(plan.items);
    setAiSummary(summary);
    setGeneratingAi(false);
  };

  if (loading) return <div className="p-8 text-center">Loading details...</div>;
  if (!plan) return <div className="p-8 text-center text-red-500">Plan not found</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-sm text-gray-500">{plan.plan_number} • {plan.patient?.first_name} {plan.patient?.last_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Share2 size={16} />
            Share
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Info & Activity */}
        <div className="w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto p-6 hidden lg:block">
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Patient Details</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {plan.patient?.first_name[0]}{plan.patient?.last_name[0]}
              </div>
              <div>
                <div className="font-medium text-gray-900">{plan.patient?.first_name} {plan.patient?.last_name}</div>
                <div className="text-sm text-gray-500">{plan.patient?.email}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 grid grid-cols-2 gap-y-2 mt-4">
              <span className="text-gray-400">DOB:</span>
              <span>{plan.patient?.date_of_birth}</span>
              <span className="text-gray-400">Phone:</span>
              <span>{plan.patient?.phone}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity Log</h3>
            <div className="space-y-6">
              {activities.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-gray-200 pb-1">
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <p className="text-sm text-gray-800 font-medium">{act.message}</p>
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={10} />
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Procedures */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {shareUrl && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-800 font-medium">
                <CheckCircle size={18} />
                Share Link Generated
              </div>
              <p className="text-sm text-blue-600">Give this URL to the patient:</p>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 text-sm p-2 border border-gray-300 rounded bg-white text-gray-600" />
                <button 
                   onClick={() => navigator.clipboard.writeText(shareUrl)}
                   className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-semibold text-gray-900">Procedures</h2>
              <button 
                onClick={handleAiSummary}
                disabled={generatingAi || aiSummary.length > 0}
                className="text-xs flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 transition-colors"
              >
                <Sparkles size={14} />
                {generatingAi ? 'Thinking...' : 'AI Summary'}
              </button>
            </div>
            
            {aiSummary && (
              <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 text-sm text-purple-900 italic">
                "{aiSummary}"
              </div>
            )}

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-white">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Tooth</th>
                  <th className="px-6 py-3 text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plan.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.procedure_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{item.procedure_name}</div>
                      {item.notes && <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.tooth || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      ${item.fee.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500">
              + Add Procedure (Disabled in Demo)
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 rounded-lg border border-gray-200 bg-white">
               <h3 className="font-semibold text-gray-900 mb-2">Internal Notes</h3>
               <textarea 
                  className="w-full h-24 p-2 text-sm border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  defaultValue={plan.notes_internal || ''}
                  placeholder="Private notes for office staff..."
               />
             </div>
             <div className="p-4 rounded-lg border border-gray-200 bg-white">
                <h3 className="font-semibold text-gray-900 mb-2">Change Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleStatusChange(PlanStatus.PRESENTED)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Clock size={16} /> Mark Presented
                  </button>
                  <button 
                     onClick={() => handleStatusChange(PlanStatus.ACCEPTED)}
                     className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <CheckCircle size={16} /> Mark Accepted
                  </button>
                  <button 
                     onClick={() => handleStatusChange(PlanStatus.DECLINED)}
                     className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <XCircle size={16} /> Mark Declined
                  </button>
                  <button 
                     onClick={() => handleStatusChange(PlanStatus.ON_HOLD)}
                     className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                  >
                    <AlertCircle size={16} /> Mark On Hold
                  </button>
                </div>
             </div>
          </div>

        </div>

        {/* Right: Financials */}
        <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col gap-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Financial Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-500">Total Treatment</span>
                <span className="font-semibold text-gray-900">${plan.total_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-500">Est. Insurance</span>
                <span className="font-medium text-green-600">-${plan.estimated_insurance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-900 font-bold text-lg">Patient Portion</span>
                <span className="text-blue-600 font-bold text-2xl">${plan.patient_portion.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-8 bg-gray-50 p-4 rounded-lg text-xs text-gray-500">
              * Insurance estimates are not a guarantee of payment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};