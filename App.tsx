import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TreatmentPlansPage } from './pages/TreatmentPlansPage';
import { TreatmentPlanDetailPage } from './pages/TreatmentPlanDetailPage';
import { PatientPlanPage } from './pages/PatientPlanPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<TreatmentPlansPage />} />
          <Route path="/plan/:id" element={<TreatmentPlanDetailPage />} />
          <Route path="/p/:token" element={<PatientPlanPage />} />
          <Route path="/patients" element={<div className="p-8 text-gray-500">Patient management not implemented in this demo.</div>} />
          <Route path="/settings" element={<div className="p-8 text-gray-500">Settings not implemented in this demo.</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
