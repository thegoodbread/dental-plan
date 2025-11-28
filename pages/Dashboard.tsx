import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlans } from '../services/api';
import { TreatmentPlan, PlanStatus } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      const data = await getPlans({ search: searchTerm, status: statusFilter });
      setPlans(data);
      setLoading(false);
    };

    const debounce = setTimeout(fetchPlans, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, statusFilter]);

  const tabs = ['ALL', ...Object.values(PlanStatus)];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track patient treatment proposals.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Plus size={18} />
          New Plan
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, plan number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'ALL' ? 'All Plans' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Fee</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No plans found matching your criteria.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr 
                    key={plan.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{plan.title}</div>
                      <div className="text-xs text-gray-500">{plan.plan_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {plan.patient?.first_name} {plan.patient?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">DOB: {plan.patient?.date_of_birth}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ${plan.total_fee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(plan.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};