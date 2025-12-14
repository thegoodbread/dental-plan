
import React, { useEffect, useRef } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { NotesComposer } from '../charting/NotesComposer';
import { useChairside } from '../../context/ChairsideContext';
import { updateVisit } from '../../services/treatmentPlans';
import { generateSoapSectionsForVisit } from '../../domain/NoteComposer';

interface VisitNotesPanelProps {
  visit: Visit;
  items: TreatmentPlanItem[]; // All plan items, we filter for this visit
  onUpdate: () => void;
}

export const VisitNotesPanel: React.FC<VisitNotesPanelProps> = ({ visit, items, onUpdate }) => {
  const { 
    setSoapSections,
    soapSections,
    signNote,
    noteStatus
  } = useChairside();

  // Guard ref to ensure seeding runs exactly once per mount/update cycle if conditions met
  const seededVisitIdRef = useRef<string | null>(null);

  // --- SEEDING LOGIC ---
  useEffect(() => {
    // 1. Basic Guards
    if (noteStatus === 'signed') return;
    if (seededVisitIdRef.current === visit.id) return;
    if (soapSections.length === 0) return; // Wait for context to initialize

    // Check state of current context and saved snapshot
    const contextHasContent = soapSections.some(s => s.content && s.content.trim().length > 0);
    const snapshotHasContent = 
        Array.isArray(visit.soapSections) && 
        visit.soapSections.some(s => s.content && s.content.trim().length > 0);

    // 2. Snapshot Restore (Highest Priority)
    // If we have a valid snapshot and the editor is currently empty (or has irrelevant data), restore it.
    // Note: We trust the parent (VisitDetailModal) to provide a clean context via initialVisitId,
    // so if context is empty, it's safe to load.
    if (snapshotHasContent && !contextHasContent) {
        // Bulk update is safer than looping updates
        setSoapSections(visit.soapSections!);
        seededVisitIdRef.current = visit.id;
        return; 
    }

    // 3. Respect Existing Content
    // If the user has already typed something (or we just restored), do not auto-generate.
    if (contextHasContent) {
        seededVisitIdRef.current = visit.id;
        return;
    }

    // 4. Deterministic Seeding (Only runs if context is empty and no snapshot restored)
    const proceduresForVisit = items.filter(i => i.performedInVisitId === visit.id);
    
    if (proceduresForVisit.length > 0) {
        
        // Generate complete SOAP sections deterministically
        const { sections: generatedSections } = generateSoapSectionsForVisit(
            visit,
            proceduresForVisit,
            visit.assignedRisks || [], 
            soapSections
        );

        // Bulk Apply - Critical for correct rendering without stale closures
        setSoapSections(generatedSections);

        // 5. Persist Seeding State to Visit Record immediately
        // This ensures that even if user navigates away, the "Snapshot" is saved and restored next time.
        const updatedSeededIds = proceduresForVisit.map(p => p.id);
        
        updateVisit(visit.id, {
            seededProcedureIds: updatedSeededIds,
            soapSections: generatedSections // Persist the generated sections as snapshot
        });
        
        // Mark as seeded in ref
        seededVisitIdRef.current = visit.id;
        
        // Refresh parent to reflect the new seededProcedureIds
        onUpdate(); 
    } else {
        // No procedures to seed yet. 
        // We DO NOT mark seededVisitIdRef here.
        // This allows the effect to run again if 'items' updates later.
    }

  }, [visit, items, soapSections, noteStatus, onUpdate, setSoapSections]);

  // Handler to persist current context state to the Visit Record (Manual Save)
  const handleVisitSave = () => {
      // Re-generate deterministic parts to ensure latest data, then merge with user edits?
      // Actually, 'Save & Regenerate' typically means "Refresh from data".
      // If we just want to save what's on screen, that's different.
      // Based on charting flow, "Save & Regenerate" RE-RUNS generator.
      
      const proceduresForVisit = items.filter(i => i.performedInVisitId === visit.id);
      
      const { sections: generatedSections } = generateSoapSectionsForVisit(
          visit,
          proceduresForVisit,
          visit.assignedRisks || [],
          soapSections
      );

      // Bulk Update Context
      setSoapSections(generatedSections);

      // Persist to Visit Record
      const noteText = generatedSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      
      updateVisit(visit.id, {
          soapSections: generatedSections,
          clinicalNote: noteText,
          seededProcedureIds: proceduresForVisit.map(p => p.id)
      });
      
      onUpdate();
  };

  const handleVisitSign = () => {
      // 1. Update Context State
      signNote(); 
      
      // 2. Update Visit Record
      const noteText = soapSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      updateVisit(visit.id, {
          soapSections, // Save final state
          clinicalNote: noteText,
          noteStatus: 'signed',
          noteSignedAt: new Date().toISOString()
      });
      
      onUpdate();
  };

  const relevantItemsCount = items.filter(i => i.performedInVisitId === visit.id).length;

  return (
    <div className="h-full flex flex-col bg-white">
        <NotesComposer 
            activeToothNumber={null}
            activeToothRecord={null}
            onToothClick={() => {}}
            viewMode="page"
            // Overrides to ensure we save to the Visit entity
            onSave={handleVisitSave}
            onSign={handleVisitSign}
            // Context label for the header
            pendingProcedure={relevantItemsCount > 0 ? {
                label: `${relevantItemsCount} Procedures`,
                teeth: [] 
            } : undefined}
            // Pass seeded IDs
            seededProcedureIds={visit.seededProcedureIds}
            visitId={visit.id}
            chiefComplaint={visit.chiefComplaint}
        />
    </div>
  );
};
