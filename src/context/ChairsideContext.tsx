
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChairsideViewMode, TimelineEvent, QuickActionType } from '../../types/charting';
import { SoapSection, SoapSectionType, ToothNumber, VisitType, NoteEngineProcedureInput } from '../domain/dentalTypes';
import { applyTemplateToSoapSections } from '../domain/procedureNoteEngine';

// Lightweight snapshot for Undo functionality
interface UndoSnapshot {
  content: string;
  sourceLabel: string;
}

interface ChairsideContextType {
  currentView: ChairsideViewMode;
  setCurrentView: (view: ChairsideViewMode) => void;
  
  activeComposer: QuickActionType | null;
  setActiveComposer: (action: QuickActionType | null) => void;
  
  selectedTeeth: ToothNumber[];
  toggleTooth: (tooth: number) => void;
  clearTeeth: () => void;

  timeline: TimelineEvent[];
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;

  // Drawer State
  isQuickNoteOpen: boolean;
  setIsQuickNoteOpen: (isOpen: boolean) => void;

  // SOAP State
  soapSections: SoapSection[];
  updateSoapSection: (id: string, content: string) => void;
  setSoapSections: (sections: SoapSection[]) => void; // New bulk update
  updateCurrentNoteSectionsFromProcedure: (item: NoteEngineProcedureInput, visitType: VisitType) => void;
  
  // Note Status & Persistence
  noteStatus: 'draft' | 'signed';
  saveCurrentNote: () => void;
  signNote: () => void;
  lastSavedAt?: string;

  // Undo / Redo Support
  undoSnapshots: Record<string, UndoSnapshot>;
  undoAppend: (sectionId: string) => void;
  dismissUndo: (sectionId: string) => void;

  // Context Identifiers
  currentTenantId: string;
  currentPatientId: string;
  currentTreatmentPlanId: string;
  currentNoteId: string;
  currentUserId: string;
}

const ChairsideContext = createContext<ChairsideContextType | undefined>(undefined);

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

interface ChairsideProviderProps {
    children: React.ReactNode;
    initialVisitId?: string; // Allow override for visit-specific contexts
}

export const ChairsideProvider: React.FC<ChairsideProviderProps> = ({ children, initialVisitId }) => {
  const [currentView, setCurrentView] = useState<ChairsideViewMode>('DASHBOARD');
  const [activeComposer, setActiveComposer] = useState<QuickActionType | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<ToothNumber[]>([]);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  
  // Mock Context Values
  const [currentTenantId] = useState('tenant-demo-1');
  const [currentPatientId] = useState('patient-demo-1');
  const [currentTreatmentPlanId] = useState('plan-demo-A');
  const [currentUserId] = useState('user-dr-smith');

  // Visit-Based Identity
  // If initialVisitId is provided (e.g. from VisitDetailModal), use it to isolate this session's drafts
  const [currentVisitId] = useState(() => {
      if (initialVisitId) return initialVisitId;
      const today = new Date().toISOString().split('T')[0];
      return `visit-${today}`;
  });

  const currentNoteId = useMemo(() => {
      return `note-${currentPatientId}-${currentVisitId}`;
  }, [currentPatientId, currentVisitId]);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: '1', type: 'CHECK_IN', title: 'Patient Checked In', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: '2', type: 'RADIOGRAPH', title: '4 BWX Taken', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), details: 'Standard series' },
  ]);

  // SOAP State
  const [soapSections, setSoapSectionsState] = useState<SoapSection[]>([]);
  const [noteStatus, setNoteStatus] = useState<'draft' | 'signed'>('draft');
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [undoSnapshots, setUndoSnapshots] = useState<Record<string, UndoSnapshot>>({});
  
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- PERSISTENCE HELPERS ---
  const buildNoteStorageKey = useCallback(() => {
    return `chairside-note-${currentTenantId}-${currentPatientId}-${currentNoteId}`;
  }, [currentTenantId, currentPatientId, currentNoteId]);

  const loadCurrentNoteFromStorage = useCallback((): { sections: SoapSection[], status: 'draft'|'signed', savedAt?: string } | null => {
    if (typeof window === 'undefined') return null;
    const key = buildNoteStorageKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
          sections: parsed?.soapSections ?? [],
          status: parsed?.status ?? 'draft',
          savedAt: parsed?.savedAt
      };
    } catch {
      return null;
    }
  }, [buildNoteStorageKey]);

  const saveCurrentNoteToStorage = useCallback((sections: SoapSection[], status: 'draft' | 'signed') => {
    if (noteStatus === 'signed' && status !== 'signed') {
        console.warn("Attempted to modify a signed note. Operation blocked.");
        return;
    }

    if (typeof window === 'undefined') return;

    const key = buildNoteStorageKey();
    const now = new Date().toISOString();
    const payload = {
      tenantId: currentTenantId,
      patientId: currentPatientId,
      treatmentPlanId: currentTreatmentPlanId,
      noteId: currentNoteId,
      soapSections: sections,
      status: status,
      savedAt: now
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
    setLastSavedAt(now);
  }, [buildNoteStorageKey, currentTenantId, currentPatientId, currentTreatmentPlanId, currentNoteId, noteStatus]);

  // Initialize SOAP sections from Storage or Default
  useEffect(() => {
    const data = loadCurrentNoteFromStorage();
    
    if (data && data.sections.length > 0) {
        setSoapSectionsState(data.sections);
        setNoteStatus(data.status);
        if (data.savedAt) setLastSavedAt(data.savedAt);
    } else {
        // Init clean sections
        setSoapSectionsState(SECTION_ORDER.map(type => ({
            id: `s-${type}`,
            type,
            title: SECTION_LABELS[type],
            content: '',
            lastEditedAt: new Date().toISOString()
        })));
        setNoteStatus('draft');
    }
  }, [currentNoteId, loadCurrentNoteFromStorage]);

  // --- ACTIONS ---

  const toggleTooth = (tooth: number) => {
    const t = String(tooth) as ToothNumber;
    setSelectedTeeth(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
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

  const triggerAutoSave = (sections: SoapSection[], status: 'draft'|'signed') => {
    if (status === 'signed') return; 
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentNoteToStorage(sections, status);
    }, 5000);
  };

  const updateSoapSection = (id: string, content: string) => {
    if (noteStatus === 'signed') return;

    // Use functional update to ensure we always work with the latest state
    // preventing stale closure issues when called rapidly (e.g. in a loop)
    setSoapSectionsState(prevSections => {
        const updated = prevSections.map(s => 
          s.id === id 
            ? { ...s, content, lastEditedAt: new Date().toISOString() } 
            : s
        );
        
        // Side effects (undo snapshot clearing) - conceptually outside the pure state update
        // but safe enough here for local state. 
        // Note: undoSnapshots is separate state, so we update it separately below if needed.
        
        triggerAutoSave(updated, noteStatus);
        return updated;
    });

    if (undoSnapshots[id]) {
        setUndoSnapshots(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }
  };

  const setSoapSectionsBulk = (newSections: SoapSection[]) => {
      if (noteStatus === 'signed') return;
      setSoapSectionsState(newSections);
      triggerAutoSave(newSections, noteStatus);
  };

  const updateCurrentNoteSectionsFromProcedure = (item: NoteEngineProcedureInput, visitType: VisitType) => {
    if (noteStatus === 'signed') return;

    const { updatedSections } = applyTemplateToSoapSections({
        item,
        visitType, 
        selectedTeeth: item.selectedTeeth?.map(t => Number(t)),
        existingSections: soapSections
    });

    const newSnapshots = { ...undoSnapshots };
    let hasChanges = false;

    updatedSections.forEach(newSec => {
        const oldSec = soapSections.find(s => s.id === newSec.id);
        if (oldSec && oldSec.content !== newSec.content) {
            newSnapshots[newSec.id] = {
                content: oldSec.content,
                sourceLabel: item.procedureName,
            };
            hasChanges = true;
        }
    });

    if (hasChanges) {
        setUndoSnapshots(newSnapshots);
        setSoapSectionsState(updatedSections);
        saveCurrentNoteToStorage(updatedSections, noteStatus);
    }
  };

  const undoAppend = (sectionId: string) => {
      if (noteStatus === 'signed') return;

      const snapshot = undoSnapshots[sectionId];
      if (snapshot) {
          const updated = soapSections.map(s => 
              s.id === sectionId ? { ...s, content: snapshot.content, lastEditedAt: new Date().toISOString() } : s
          );
          setSoapSectionsState(updated);
          setUndoSnapshots(prev => {
              const next = { ...prev };
              delete next[sectionId];
              return next;
          });
          saveCurrentNoteToStorage(updated, noteStatus);
      }
  };

  const dismissUndo = (sectionId: string) => {
      setUndoSnapshots(prev => {
          const next = { ...prev };
          delete next[sectionId];
          return next;
      });
  };

  const saveCurrentNote = () => {
    if (noteStatus === 'signed') return;
    saveCurrentNoteToStorage(soapSections, noteStatus);
  };

  const signNote = () => {
      setNoteStatus('signed');
      setUndoSnapshots({});
      if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
      }
      saveCurrentNoteToStorage(soapSections, 'signed');
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
      setSoapSections: setSoapSectionsBulk,
      updateCurrentNoteSectionsFromProcedure,
      saveCurrentNote,
      signNote,
      lastSavedAt,
      noteStatus,
      undoSnapshots,
      undoAppend,
      dismissUndo
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
