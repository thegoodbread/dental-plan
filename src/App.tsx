
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Layout } from './components/Layout';
import { TreatmentPlansPage } from './pages/TreatmentPlansPage';
import { TreatmentPlanDetailPage } from './pages/TreatmentPlanDetailPage';
import { PatientPlanPage } from './pages/PatientPlanPage';
import { ClaimCompilerPage } from './pages/ClaimCompilerPage';
import { PatientListPage } from './pages/PatientListPage';
import { SettingsPage } from './pages/SettingsPage';

const { HashRouter: Router, Routes, Route, Navigate } = ReactRouterDOM;

const AppContent: React.FC = () => {
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
        <Route path="/claim-compiler/:visitId" element={<ClaimCompilerPage />} />
        <Route path="/p/:token" element={<PatientPlanPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
