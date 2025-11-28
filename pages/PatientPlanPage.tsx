
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPlanByShareToken } from '../services/treatmentPlans'; 
import { TreatmentPlan, TreatmentPlanItem } from '../types';
import { PremiumPatientLayout } from '../components/patient/PremiumPatientLayout';

export const PatientPlanPage: React.FC<{ token?: string }> = (props) => {
  const { token: routeToken } = useParams<{ token: string }>();
  const activeToken = props.token || routeToken;

  const [data, setData] = useState<{ plan: TreatmentPlan, items: TreatmentPlanItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeToken) {
      const result = getPlanByShareToken(activeToken);
      if (result) {
        setData(result);
      } else {
        console.warn("Token not found");
      }
      setLoading(false);
    }
  }, [activeToken]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Invalid or Expired Link</div>;

  return <PremiumPatientLayout plan={data.plan} items={data.items} />;
};
