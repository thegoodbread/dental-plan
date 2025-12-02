
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
}

const ChairsideContext = createContext<ChairsideContextType | undefined>(undefined);

export const ChairsideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ChairsideViewMode>('DASHBOARD');
  const [activeComposer, setActiveComposer] = useState<QuickActionType | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  
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
      addTimelineEvent
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
