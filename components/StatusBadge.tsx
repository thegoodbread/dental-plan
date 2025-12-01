import React from 'react';
import { TreatmentPlanStatus } from '../types';

interface StatusBadgeProps {
  status: TreatmentPlanStatus;
}

const styles: Record<TreatmentPlanStatus, string> = {
  'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
  'PRESENTED': 'bg-blue-100 text-blue-800 border-blue-200',
  'ACCEPTED': 'bg-green-100 text-green-800 border-green-200',
  'DECLINED': 'bg-red-100 text-red-800 border-red-200',
  'ON_HOLD': 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const labels: Record<TreatmentPlanStatus, string> = {
  'DRAFT': 'Draft',
  'PRESENTED': 'Presented',
  'ACCEPTED': 'Accepted',
  'DECLINED': 'Declined',
  'ON_HOLD': 'On Hold',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['DRAFT']}`}>
      {labels[status] || 'Unknown'}
    </span>
  );
};
