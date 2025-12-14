
import React, { useEffect, useRef } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { NotesComposer } from '../charting/NotesComposer';
import { useChairside } from '../../context/ChairsideContext';
import { NoteEngineProcedureInput, ToothNumber, VisitType } from '../../domain/dentalTypes';
import { updateVisit } from '../../services/treatmentPlans';

interface VisitNotesPanelProps {
  visit: Visit;
  items: TreatmentPlanItem[]; // All plan items, we filter for this visit
  onUpdate: () => void;
}

export const VisitNotesPanel: React.FC<VisitNotesPanelProps> = ({ visit, items, onUpdate }) => {
  const { 
    updateCurrentNoteSectionsFromProcedure, 
    updateSoapSection,
    soapSections,
    noteStatus,
    signNote
  } = useChairside();

  const hasInitialized = useRef(false);

  useEffect(() => {
    // Guard 1: Prevent re-running if this specific component instance has already initialized.
    // This handles local state updates during the session.
    if (hasInitialized.current) return;
    
    // Guard 2: Check if the global Context already has content (e.g., from tab switching).
    // If the user switches tabs, the component unmounts but the Context (ChairsideProvider)
    // retains the soapSections. When we remount, we must check if content exists 
    // to avoid appending the same templates a second time.
    const hasActiveDraft = soapSections.some(s => s.content && s.content.trim().length > 0);
    
    if (hasActiveDraft) {
        hasInitialized.current = true;
        return;
    }

    // 1. If the visit object itself has saved SOAP sections (from DB/LocalStorage), load them.
    if (visit.soapSections && visit.soapSections.length > 0) {
        visit.soapSections.forEach(section => {
            updateSoapSection(section.id, section.content);
        });
    } else {
        // 2. Otherwise, auto-generate from attached items (Deterministic Template Engine).
        const visitType = (visit.visitType as VisitType) || 'restorative';
        
        // Filter items specific to this visit
        const visitItems = items.filter(i => i.performedInVisitId === visit.id);
        
        if (visitItems.length > 0) {
            visitItems.forEach(item => {
                // Map TreatmentPlanItem to NoteEngineProcedureInput
                const input: NoteEngineProcedureInput = {
                    id: item.id,
                    procedureName: item.procedureName,
                    procedureCode: item.procedureCode,
                    selectedTeeth: item.selectedTeeth?.map(t => String(t) as ToothNumber) || [],
                    selectedQuadrants: item.selectedQuadrants || [],
                    selectedArches: item.selectedArches || [],
                    surfaces: [] // Surfaces could be derived if stored, currently implicit
                };

                updateCurrentNoteSectionsFromProcedure(input, visitType);
            });
        }
    }

    hasInitialized.current = true;
  }, [visit, items, updateCurrentNoteSectionsFromProcedure, updateSoapSection, soapSections]);

  // Handler to persist current context state to the Visit Record
  const handleVisitSave = () => {
      // Generate flat text representation for search/summary
      const noteText = soapSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      
      updateVisit(visit.id, {
          soapSections,
          clinicalNote: noteText,
          // noteStatus: 'draft' // Keep as draft
      });
      onUpdate();
  };

  const handleVisitSign = () => {
      // 1. Update Context State
      signNote(); 
      
      // 2. Update Visit Record
      const noteText = soapSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      updateVisit(visit.id, {
          soapSections,
          clinicalNote: noteText,
          noteStatus: 'signed',
          noteSignedAt: new Date().toISOString()
      });
      
      onUpdate();
  };

  return (
    <div className="h-full flex flex-col bg-white">
        <NotesComposer 
            activeToothNumber={null}
            activeToothRecord={null}
            onToothClick={() => {}}
            viewMode="page"
            // Overrides to ensure we save to the Visit entity, not just the generic context LS
            onSave={handleVisitSave}
            onSign={handleVisitSign}
            // Context label for the header
            pendingProcedure={items.length > 0 ? {
                label: `${items.length} Procedures`,
                teeth: [] 
            } : undefined}
        />
    </div>
  );
};
