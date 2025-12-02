
import React, { createContext, useContext, useState } from 'react';
import { ChairsideViewMode, TimelineEvent, QuickActionType } from '../types/charting';

interface ChairsideContextType {
  currentView: ChairsideViewMode;
  setCurrentView: (view: ChairsideViewMode) => void;
  
  activeComposer: QuickActionType | null;
  setActiveComposer: (action: QuickActionType | null) => void;
  
  selectedTeeth: number[];
  toggleTooth: (tooth: number) => void;
  clearTeeth: () => void;

  timeline: TimelineEvent[];
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;

  // Context Identifiers
  currentTenantId: string;
  currentPatientId: string;
  currentTreatmentPlanId: string;
  currentNoteId: string;
  currentUserId: string;
}

const ChairsideContext = createContext<ChairsideContextType | undefined>(undefined);

// Helper for collision-resistant IDs (temporary until backend wired)
const buildNoteIdForToday = () => {
  const datePart = new Date().toISOString().split('T')[0];
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `note-${datePart}-${randomPart}`;
};

export const ChairsideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ChairsideViewMode>('DASHBOARD');
  const [activeComposer, setActiveComposer] = useState<QuickActionType | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  
  // Mock Context Values (In a real app, these would come from auth/routing)
  const [currentTenantId] = useState('tenant-demo-1');
  const [currentPatientId] = useState('patient-demo-1');
  const [currentTreatmentPlanId] = useState('plan-demo-A');
  
  // TODO: When wiring to a real backend, replace this with the actual note ID from the server/router.
  const [currentNoteId] = useState(buildNoteIdForToday); 
  
  const [currentUserId] = useState('user-dr-smith');

  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: '1', type: 'CHECK_IN', title: 'Patient Checked In', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: '2', type: 'RADIOGRAPH', title: '4 BWX Taken', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), details: 'Standard series' },
  ]);

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth(prev => 
      prev.includes(tooth) ? prev.filter(t => t !== tooth) : [...prev, tooth]
    );
  };

  const clearTeeth = () => setSelectedTeeth([]);

  const addTimelineEvent = (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    setTimeline(prev => [newEvent, ...prev]);
  };

  return (
    <ChairsideContext.Provider value={{
      currentView,
      setCurrentView,
      activeComposer,
      setActiveComposer,
      selectedTeeth,
      toggleTooth,
      clearTeeth,
      timeline,
      addTimelineEvent,
      currentTenantId,
      currentPatientId,
      currentTreatmentPlanId,
      currentNoteId,
      currentUserId
    }}>
      {children}
    </ChairsideContext.Provider>
  );
};

export const useChairside = () => {
  const context = useContext(ChairsideContext);
  if (!context) throw new Error("useChairside must be used within a ChairsideProvider");
  return context;
};
