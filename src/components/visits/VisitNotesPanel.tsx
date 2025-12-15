
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { NotesComposer } from '../charting/NotesComposer';
import { useChairside, getIncompleteFactSections } from '../../context/ChairsideContext';
import { updateVisit } from '../../services/treatmentPlans';
import { generateSoapSectionsForVisit, composeVisitNoteFromAssertions, mapNoteToExistingSections } from '../../domain/NoteComposer';
import { generateTruthAssertionsForVisit, composeSectionsFromAssertions, AssertionSlot, TruthAssertionsBundle } from '../../domain/TruthAssertions';
import { SoapSectionType } from '../../domain/dentalTypes';
import { FactReviewModal } from '../modals/FactReviewModal';

interface VisitNotesPanelProps {
  visit: Visit;
  items: TreatmentPlanItem[]; // All plan items, we filter for this visit
  onUpdate: () => void;
}

// Pure helper to compute incomplete sections for verification
function computeIncompleteSections(
  truth: TruthAssertionsBundle,
  factReviewStatus: Record<string, 'pending' | 'reviewed'>,
  evaluateSlotCompleteness: (truth: TruthAssertionsBundle, section: SoapSectionType) => Record<AssertionSlot, 'complete' | 'empty' | 'not_required'>
): { section: SoapSectionType; missingSlots: AssertionSlot[] }[] {
  // Identify relevant sections (those with any assertions)
  const relevantSections = Array.from(new Set(truth.assertions.map(a => a.section as SoapSectionType)));
  const incomplete: { section: SoapSectionType; missingSlots: AssertionSlot[] }[] = [];

  relevantSections.forEach(section => {
      // 1. Check general review status
      // (Optional: could add a hard check for review status here)

      // 2. Check slots
      const completeness = evaluateSlotCompleteness(truth, section);
      const missingSlots: AssertionSlot[] = [];
      
      (Object.keys(completeness) as AssertionSlot[]).forEach(slot => {
          if (completeness[slot] === 'empty') {
              missingSlots.push(slot);
          }
      });

      if (factReviewStatus[section] !== 'reviewed' || missingSlots.length > 0) {
          incomplete.push({ section, missingSlots });
      }
  });

  return incomplete;
}

export const VisitNotesPanel: React.FC<VisitNotesPanelProps> = ({ visit, items, onUpdate }) => {
  const { 
    setSoapSections,
    soapSections,
    signNote,
    noteStatus,
    setTruthAssertions, 
    truthAssertions,
    factReviewStatus,
    evaluateSlotCompleteness,
    toggleFactSection,
    factSectionStates,
    noteCompleteness
  } = useChairside();

  // Guard ref to ensure seeding runs exactly once per mount/update cycle if conditions met
  const seededVisitIdRef = useRef<string | null>(null);
  
  // State for review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<{ section: SoapSectionType; missingSlots: AssertionSlot[] }[]>([]);

  // Filter items for this visit - MEMOIZED to prevent infinite loops
  const relevantItems = useMemo(() => 
    items.filter(i => i.performedInVisitId === visit.id),
    [items, visit.id]
  );

  // --- SEEDING LOGIC ---
  useEffect(() => {
    // 1. Basic Guards
    if (noteStatus === 'signed') return;
    
    // --- Truth Assertions Generation (Guard against infinite updates) ---
    // Only generate if we have items AND (we haven't generated yet OR it's for a different visit)
    // We explicitly check truthAssertions.visitId to allow switching between visits without stale state
    const needsAssertions = relevantItems.length > 0 && 
        (!truthAssertions || truthAssertions.visitId !== visit.id);

    if (needsAssertions) {
        const bundle = generateTruthAssertionsForVisit(
            visit,
            relevantItems,
            visit.assignedRisks || []
        );
        // Use a timeout to push this to the next tick, avoiding "update while rendering" warnings in some cases
        setTimeout(() => setTruthAssertions(bundle), 0);
    }

    if (seededVisitIdRef.current === visit.id) return;
    if (soapSections.length === 0) return; // Wait for context to initialize

    // Check state of current context and saved snapshot
    const contextHasContent = soapSections.some(s => s.content && s.content.trim().length > 0);
    const snapshotHasContent = 
        Array.isArray(visit.soapSections) && 
        visit.soapSections.some(s => s.content && s.content.trim().length > 0);

    // 2. Snapshot Restore (Highest Priority)
    // If we have a valid snapshot and the editor is currently empty (or has irrelevant data), restore it.
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
    if (relevantItems.length > 0) {
        
        // Generate complete SOAP sections deterministically
        const { sections: generatedSections } = generateSoapSectionsForVisit(
            visit,
            relevantItems,
            visit.assignedRisks || [], 
            soapSections
        );

        // Bulk Apply - Critical for correct rendering without stale closures
        setSoapSections(generatedSections);

        // 5. Persist Seeding State to Visit Record immediately
        // This ensures that even if user navigates away, the "Snapshot" is saved and restored next time.
        const updatedSeededIds = relevantItems.map(p => p.id);
        
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

  }, [visit, relevantItems, soapSections, noteStatus, onUpdate, setSoapSections, setTruthAssertions, truthAssertions]);

  // Handler to persist current context state to the Visit Record (Manual Save)
  const handleVisitSave = () => {
      // Re-run standard generator for safety or rely on context?
      // Standard behavior: Re-generate text based on current inputs
      const { sections: generatedSections } = generateSoapSectionsForVisit(
          visit,
          relevantItems,
          visit.assignedRisks || [],
          soapSections
      );

      // V2.5: Apply truth assertions override if present
      let finalSections = generatedSections;
      if (truthAssertions && truthAssertions.assertions && truthAssertions.assertions.length > 0) {
          finalSections = composeSectionsFromAssertions(generatedSections, truthAssertions);
      }

      // Bulk Update Context
      setSoapSections(finalSections);
      
      // Update assertions
      const bundle = generateTruthAssertionsForVisit(
          visit,
          relevantItems,
          visit.assignedRisks || []
      );
      setTruthAssertions(bundle);

      // Persist to Visit Record
      const noteText = finalSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      
      updateVisit(visit.id, {
          soapSections: finalSections,
          clinicalNote: noteText,
          seededProcedureIds: relevantItems.map(p => p.id)
      });
      
      onUpdate();
  };

  const performSign = () => {
      // 1. Update Context State
      signNote(); 
      
      let finalSections = soapSections;

      // --- Improvement: Use Truth Assertions if available ---
      // If the user has been interacting with the Truth Blocks panel, we prefer that authoritative source.
      if (truthAssertions && truthAssertions.visitId === visit.id && truthAssertions.assertions.length > 0) {
          // V2.5: Use proper section composition
          finalSections = composeSectionsFromAssertions(soapSections, truthAssertions);
      }

      // 2. Update Visit Record
      const noteText = finalSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
      updateVisit(visit.id, {
          soapSections: finalSections, // Save final state
          clinicalNote: noteText,
          noteStatus: 'signed',
          noteSignedAt: new Date().toISOString()
      });
      
      onUpdate();
      setShowReviewModal(false);
  };

  // Verify without signing
  const handleVerifySecondary = () => {
      if (!truthAssertions) return;
      const incomplete = computeIncompleteSections(truthAssertions, factReviewStatus, evaluateSlotCompleteness);
      if (incomplete.length > 0) {
          setIncompleteSections(incomplete);
          setShowReviewModal(true);
      } else {
          // Could optionally toast success here
      }
  };

  const handleVisitSign = () => {
      // Check for incomplete facts (V2.5 + V3 Slot Logic)
      if (!truthAssertions) {
          performSign();
          return;
      }

      const incomplete = computeIncompleteSections(truthAssertions, factReviewStatus, evaluateSlotCompleteness);
      
      if (incomplete.length > 0) {
          setIncompleteSections(incomplete);
          setShowReviewModal(true);
      } else {
          performSign();
      }
  };

  const handleJumpToSection = (section: SoapSectionType, slot?: AssertionSlot) => {
      // 1. Ensure Facts are expanded for this section in Context
      // Find ID for this section type (e.g. 's-SUBJECTIVE')
      const sectionObj = soapSections.find(s => s.type === section);
      if (sectionObj && !factSectionStates[sectionObj.id]) {
          toggleFactSection(sectionObj.id);
      }

      // 2. Scroll into view via DOM (Wait for render)
      setTimeout(() => {
          const elementId = slot ? `slot-${section}-${slot}` : `section-${section}`;
          const el = document.getElementById(elementId);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (slot) {
              // Fallback to section if slot not found
              const secEl = document.getElementById(`section-${section}`);
              if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }, 150);
  };

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
            onVerifySecondary={handleVerifySecondary}
            // Context label for the header
            pendingProcedure={relevantItems.length > 0 ? {
                label: `${relevantItems.length} Procedures`,
                teeth: [] 
            } : undefined}
            // Pass seeded IDs
            seededProcedureIds={visit.seededProcedureIds}
            visitId={visit.id}
            chiefComplaint={visit.chiefComplaint}
            procedures={relevantItems} // Pass filtered items for UI
        />
        
        <FactReviewModal 
            isOpen={showReviewModal}
            incompleteSections={incompleteSections}
            onReviewNow={() => setShowReviewModal(false)}
            onSignAnyway={performSign}
            onJumpToSection={handleJumpToSection}
            completenessPercent={noteCompleteness?.percent}
        />
    </div>
  );
};
