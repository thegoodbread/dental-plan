import React from 'react';
import { PlanStatus } from '../../types';

interface StatusBadgeProps {
  status: PlanStatus;
}

const styles: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200',
  [PlanStatus.PRESENTED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PlanStatus.ACCEPTED]: 'bg-green-100 text-green-800 border-green-200',
  [PlanStatus.DECLINED]: 'bg-red-100 text-red-800 border-red-200',
  [PlanStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const labels: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'Draft',
  [PlanStatus.PRESENTED]: 'Presented',
  [PlanStatus.ACCEPTED]: 'Accepted',
  [PlanStatus.DECLINED]: 'Declined',
  [PlanStatus.ON_HOLD]: 'On Hold',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};