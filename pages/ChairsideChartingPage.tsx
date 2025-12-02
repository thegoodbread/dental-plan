
import React from 'react';
import { ChairsideProvider, useChairside } from '../context/ChairsideContext';
import { QuickActions } from '../components/charting/QuickActions';
import { Timeline } from '../components/charting/Timeline';
import { ContextPane } from '../components/charting/ContextPane';
import { PerioChart } from '../components/charting/PerioChart';
import { NotesComposer } from '../components/charting/NotesComposer';
import { RadiographViewer } from '../components/charting/RadiographViewer';
import { useParams } from 'react-router-dom';

const ChartingLayout = () => {
  const { currentView } = useChairside();

  // Full Screen Overlays
  if (currentView === 'PERIO') return <PerioChart />;
  if (currentView === 'NOTES') return <NotesComposer />;
  if (currentView === 'XRAY') return <RadiographViewer />;

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
