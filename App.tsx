import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PlanDetail } from './pages/PlanDetail';
import { PatientView } from './pages/PatientView';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan/:id" element={<PlanDetail />} />
          <Route path="/p/:token" element={<PatientView />} />
          <Route path="/patients" element={<div className="p-8 text-gray-500">Patient Management (Not implemented in demo)</div>} />
          <Route path="/settings" element={<div className="p-8 text-gray-500">Settings (Not implemented in demo)</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;