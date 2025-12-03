
import React, { useState, useEffect } from 'react';
import { ChairsideProvider, useChairside } from '../context/ChairsideContext';
import { QuickActions } from '../components/charting/QuickActions';
import { Timeline } from '../components/charting/Timeline';
import { ContextPane } from '../components/charting/ContextPane';
import { PerioChart } from '../components/charting/PerioChart';
import { NotesComposer } from '../components/charting/NotesComposer';
import { RadiographViewer } from '../components/charting/RadiographViewer';
import { QuickNoteDrawer } from '../components/charting/QuickNoteDrawer';
import { useParams } from 'react-router-dom';
import { PatientChart, ToothRecord, ToothNumber, mockPatientChart } from '../domain/dentalTypes';

const ChartingLayout = () => {
  const { currentView, selectedTeeth, activeComposer } = useChairside();
  
  // --- DOMAIN STATE ---
  const [patientChart, setPatientChart] = useState<PatientChart | null>(null);
  const [activeToothNumber, setActiveToothNumber] = useState<ToothNumber | null>(null);
  const [activeToothRecord, setActiveToothRecord] = useState<ToothRecord | null>(null);

  useEffect(() => {
    // For now, just load the mock chart.
    setPatientChart(mockPatientChart);
    // Optionally set a default active tooth like "14" if it exists in the mock.
    const defaultTooth: ToothNumber = "14";
    setActiveToothNumber(defaultTooth);
    const record = mockPatientChart.teeth.find(t => t.toothNumber === defaultTooth) || null;
    setActiveToothRecord(record);
  }, []);

  // Sync Context Selection to Local State
  useEffect(() => {
    if (selectedTeeth.length > 0) {
        // Use the first selected tooth as the primary context for the note
        setActiveToothNumber(String(selectedTeeth[0]) as ToothNumber);
    }
  }, [selectedTeeth]);

  useEffect(() => {
    if (!patientChart || !activeToothNumber) {
      setActiveToothRecord(null);
      return;
    }
    const record = patientChart.teeth.find(t => t.toothNumber === activeToothNumber) || null;
    setActiveToothRecord(record);
  }, [patientChart, activeToothNumber]);

  // Full Screen Overlays (Except Notes, which is now a drawer)
  if (currentView === 'PERIO') return <PerioChart />;
  if (currentView === 'XRAY') return <RadiographViewer />;
  
  // Note: 'NOTES' view is technically deprecated in favor of drawer, but keeping fallback just in case
  if (currentView === 'NOTES') {
    // Construct pending procedure object if composer is active
    const pendingProcedure = activeComposer ? {
        label: activeComposer,
        teeth: selectedTeeth
    } : undefined;

    return (
      <NotesComposer 
        activeToothNumber={activeToothNumber}
        activeToothRecord={activeToothRecord}
        onToothClick={(tooth) => setActiveToothNumber(prev => prev === tooth ? null : tooth)}
        viewMode="page"
        pendingProcedure={pendingProcedure}
      />
    );
  }

  // iPad Optimized 3-Column Layout
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Zone 1: Icon Dock (Fixed Left - Wider for iPad touch targets) */}
      <div className="w-[100px] shrink-0 h-full border-r border-slate-200 z-20 shadow-sm bg-slate-100">
        <QuickActions />
      </div>

      {/* Zone 2: Main Workspace (Fluid Center) */}
      <div className="flex-1 h-full min-w-0 flex flex-col bg-slate-50 relative z-10">
        <Timeline />
      </div>

      {/* Zone 3: Context Panel (Fixed Right - Tablet Size) */}
      <div className="w-[350px] shrink-0 h-full border-l border-slate-200 hidden lg:block shadow-xl z-20 bg-white">
        <ContextPane />
      </div>

      {/* Global Drawer Overlay */}
      <QuickNoteDrawer 
         activeToothNumber={activeToothNumber}
         activeToothRecord={activeToothRecord}
         onToothClick={(tooth) => setActiveToothNumber(prev => prev === tooth ? null : tooth)}
      />
    </div>
  );
};

export const ChairsideChartingPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <ChairsideProvider>
       <div className="h-screen overflow-hidden flex flex-col">
          {/* Header offset handled in Layout or Main Nav, here we ensure full height usage */}
          <div className="flex-1 overflow-hidden">
             <ChartingLayout />
          </div>
       </div>
    </ChairsideProvider>
  );
};
