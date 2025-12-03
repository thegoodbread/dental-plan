
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChairsideViewMode, TimelineEvent, QuickActionType } from '../types/charting';
import { SoapSection, SoapSectionType } from '../domain/dentalTypes';
import { TreatmentPlanItem } from '../types';
import { applyTemplateToSoapSections } from '../domain/procedureNoteEngine';

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

  // Drawer State
  isQuickNoteOpen: boolean;
  setIsQuickNoteOpen: (isOpen: boolean) => void;

  // SOAP State (Lifted from NotesComposer)
  soapSections: SoapSection[];
  updateSoapSection: (id: string, content: string) => void;
  updateCurrentNoteSectionsFromProcedure: (item: TreatmentPlanItem, visitType?: string) => void;

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

const SECTION_ORDER: SoapSectionType[] = [
  'SUBJECTIVE',
  'OBJECTIVE',
  'ASSESSMENT',
  'TREATMENT_PERFORMED',
  'PLAN'
];

const SECTION_LABELS: Record<SoapSectionType, string> = {
  'SUBJECTIVE': 'Subjective / Chief Complaint',
  'OBJECTIVE': 'Objective Findings',
  'ASSESSMENT': 'Assessment / Diagnosis',
  'TREATMENT_PERFORMED': 'Treatment Performed',
  'PLAN': 'Plan / Next Steps'
};

export const ChairsideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ChairsideViewMode>('DASHBOARD');
  const [activeComposer, setActiveComposer] = useState<QuickActionType | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  
  // Mock Context Values (In a real app, these would come from auth/routing)
  const [currentTenantId] = useState('tenant-demo-1');
  const [currentPatientId] = useState('patient-demo-1');
  const [currentTreatmentPlanId] = useState('plan-demo-A');
  
  // FIXED: Use lazy initialization for the ID so we get a string, not a function reference.
  const [currentNoteId] = useState(() => buildNoteIdForToday()); 
  
  const [currentUserId] = useState('user-dr-smith');

  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: '1', type: 'CHECK_IN', title: 'Patient Checked In', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: '2', type: 'RADIOGRAPH', title: '4 BWX Taken', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), details: 'Standard series' },
  ]);

  // SOAP State
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);

  // Initialize SOAP sections if empty
  useEffect(() => {
    setSoapSections(prev => {
      if (prev.length > 0) return prev;
      return SECTION_ORDER.map(type => ({
        id: `s-${type}`,
        type,
        title: SECTION_LABELS[type],
        content: '',
        lastEditedAt: new Date().toISOString()
      }));
    });
  }, []);

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

  const updateSoapSection = (id: string, content: string) => {
    setSoapSections(prev => prev.map(s => s.id === id ? { ...s, content, lastEditedAt: new Date().toISOString() } : s));
  };

  const updateCurrentNoteSectionsFromProcedure = (item: TreatmentPlanItem, visitType?: string) => {
    setSoapSections(prev => {
        const { updatedSections } = applyTemplateToSoapSections({
            item,
            visitType: visitType || 'restorative', // Use passed visitType or fallback
            selectedTeeth: item.selectedTeeth ?? undefined,
            existingSections: prev
        });
        return updatedSections;
    });
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
      isQuickNoteOpen,
      setIsQuickNoteOpen,
      currentTenantId,
      currentPatientId,
      currentTreatmentPlanId,
      currentNoteId,
      currentUserId,
      soapSections,
      updateSoapSection,
      updateCurrentNoteSectionsFromProcedure
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
