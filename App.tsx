
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TreatmentPlansPage } from './pages/TreatmentPlansPage';
import { TreatmentPlanDetailPage } from './pages/TreatmentPlanDetailPage';
import { PatientPlanPage } from './pages/PatientPlanPage';
import { PatientListPage } from './pages/PatientListPage';

const AppContent: React.FC = () => {
  // Check for ?token=XYZ immediately on load
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (token) {
    return <PatientPlanPage token={token} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TreatmentPlansPage />} />
        <Route path="/plan/:id" element={<TreatmentPlanDetailPage />} />
        <Route path="/p/:token" element={<PatientPlanPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/settings" element={<div className="p-8 text-gray-500">Settings not implemented in this demo.</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
