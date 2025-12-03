
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChairsideViewMode, TimelineEvent, QuickActionType } from '../types/charting';
import { SoapSection, SoapSectionType, ToothNumber, VisitType } from '../domain/dentalTypes';
import { TreatmentPlanItem } from '../types';
import { applyTemplateToSoapSections } from '../domain/procedureNoteEngine';

// Lightweight snapshot for Undo functionality
interface UndoSnapshot {
  content: string;
  sourceLabel: string;
}

// NOTE LEGAL REQUIREMENT:
// Once a note is signed, it becomes immutable. All mutation APIs and persistence paths 
// must treat `noteStatus === 'signed'` as read-only. No autosaves allowed after signing.

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
  updateCurrentNoteSectionsFromProcedure: (item: TreatmentPlanItem, visitType: VisitType) => void;
  
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

export const ChairsideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ChairsideViewMode>('DASHBOARD');
  const [activeComposer, setActiveComposer] = useState<QuickActionType | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<ToothNumber[]>([]);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  
  // Mock Context Values
  const [currentTenantId] = useState('tenant-demo-1');
  const [currentPatientId] = useState('patient-demo-1');
  const [currentTreatmentPlanId] = useState('plan-demo-A');
  const [currentUserId] = useState('user-dr-smith');

  // Visit-Based Identity (Deterministic)
  const [currentVisitId] = useState(() => {
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
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);
  const [noteStatus, setNoteStatus] = useState<'draft' | 'signed'>('draft');
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [undoSnapshots, setUndoSnapshots] = useState<Record<string, UndoSnapshot>>({});
  
  // Use ReturnType<typeof setTimeout> for browser/node compatibility
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
    // SECURITY: If the current in-memory state is signed, allow NO writes unless this specific
    // action is the one transitioning it TO 'signed' (checked via status arg).
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
        setSoapSections(data.sections);
        setNoteStatus(data.status);
        if (data.savedAt) setLastSavedAt(data.savedAt);
    } else {
        // Init clean sections
        setSoapSections(SECTION_ORDER.map(type => ({
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

  // Helper to trigger debounce save
  const triggerAutoSave = (sections: SoapSection[], status: 'draft'|'signed') => {
    // SECURITY: Autosave should never run on signed notes
    if (status === 'signed') return; 
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentNoteToStorage(sections, status);
    }, 5000); // 5 second debounce
  };

  const updateSoapSection = (id: string, content: string) => {
    if (noteStatus === 'signed') return; // LOCK: No manual edits allowed

    // If user manually edits, clear undo snapshot for that section
    if (undoSnapshots[id]) {
        setUndoSnapshots(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    const updated = soapSections.map(s => 
      s.id === id 
        ? { ...s, content, lastEditedAt: new Date().toISOString() } 
        : s
    );
    
    setSoapSections(updated); // Instant UI update
    triggerAutoSave(updated, noteStatus);
  };

  const updateCurrentNoteSectionsFromProcedure = (item: TreatmentPlanItem, visitType: VisitType) => {
    if (noteStatus === 'signed') return; // LOCK: No appends allowed

    const { updatedSections } = applyTemplateToSoapSections({
        item,
        visitType, // Passed directly, required
        selectedTeeth: item.selectedTeeth?.map(t => Number(t)) ?? undefined,
        existingSections: soapSections
    });

    // Detect changes and store snapshots for Undo
    const newSnapshots = { ...undoSnapshots };
    let hasChanges = false;

    updatedSections.forEach(newSec => {
        const oldSec = soapSections.find(s => s.id === newSec.id);
        if (oldSec && oldSec.content !== newSec.content) {
            // Snapshot the OLD content
            newSnapshots[newSec.id] = {
                content: oldSec.content,
                sourceLabel: item.procedureName,
            };
            hasChanges = true;
        }
    });

    if (hasChanges) {
        setUndoSnapshots(newSnapshots);
        setSoapSections(updatedSections);
        // Persist immediately for important state changes
        saveCurrentNoteToStorage(updatedSections, noteStatus);
    }
  };

  const undoAppend = (sectionId: string) => {
      if (noteStatus === 'signed') return; // LOCK

      const snapshot = undoSnapshots[sectionId];
      if (snapshot) {
          const updated = soapSections.map(s => 
              s.id === sectionId ? { ...s, content: snapshot.content, lastEditedAt: new Date().toISOString() } : s
          );
          setSoapSections(updated);
          // Remove snapshot after use
          setUndoSnapshots(prev => {
              const next = { ...prev };
              delete next[sectionId];
              return next;
          });
          // Save the restored state immediately
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

  // Manual Save Action
  const saveCurrentNote = () => {
    if (noteStatus === 'signed') return; // LOCK
    saveCurrentNoteToStorage(soapSections, noteStatus);
  };

  // Sign Action (Finalizes note)
  // This is the ONLY place a note transitions to 'signed'.
  const signNote = () => {
      setNoteStatus('signed');
      setUndoSnapshots({}); // Clear undo history
      
      // Cancel any pending autosave to ensure clean state
      if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
      }
      
      // Immediate final save with signed status
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
