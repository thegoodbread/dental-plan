
import React, { useState, useEffect, useCallback } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType } from '../../domain/dentalTypes';
import { ClinicalNoteEditor } from '../charting/NotesComposer';
import { updateVisit } from '../../services/treatmentPlans';
import { FileText, Save } from 'lucide-react';

interface VisitNotesPanelProps {
  visit: Visit;
  items: TreatmentPlanItem[]; // All plan items, we filter for this visit
  onUpdate: () => void;
}

const DEFAULT_SECTIONS: SoapSection[] = [
  { id: 's-sub', type: 'SUBJECTIVE', title: 'Subjective', content: '', lastEditedAt: new Date().toISOString() },
  { id: 's-obj', type: 'OBJECTIVE', title: 'Objective', content: '', lastEditedAt: new Date().toISOString() },
  { id: 's-ass', type: 'ASSESSMENT', title: 'Assessment', content: '', lastEditedAt: new Date().toISOString() },
  { id: 's-tx', type: 'TREATMENT_PERFORMED', title: 'Treatment Performed', content: '', lastEditedAt: new Date().toISOString() },
  { id: 's-plan', type: 'PLAN', title: 'Plan', content: '', lastEditedAt: new Date().toISOString() },
];

export const VisitNotesPanel: React.FC<VisitNotesPanelProps> = ({ visit, items, onUpdate }) => {
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);
  const [assignedRisks, setAssignedRisks] = useState<AssignedRisk[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);

  // Initialize from Visit Data
  useEffect(() => {
    if (visit.soapSections && visit.soapSections.length > 0) {
      setSoapSections(visit.soapSections);
    } else {
      setSoapSections(DEFAULT_SECTIONS);
    }

    if (visit.assignedRisks) {
      setAssignedRisks(visit.assignedRisks);
    } else {
      setAssignedRisks([]);
    }

    setIsLocked(visit.noteStatus === 'signed');
  }, [visit]);

  const saveToVisit = useCallback((finalStatus: 'draft' | 'signed' = 'draft') => {
    // Generate flat text representation
    const noteText = soapSections.map(s => `${s.title}:\n${s.content || 'N/A'}`).join('\n\n');
    
    updateVisit(visit.id, {
      soapSections,
      assignedRisks,
      clinicalNote: noteText,
      noteStatus: finalStatus,
      noteSignedAt: finalStatus === 'signed' ? new Date().toISOString() : undefined
    });
    
    setLastSaved(new Date().toISOString());
    setIsLocked(finalStatus === 'signed');
    onUpdate();
  }, [visit.id, soapSections, assignedRisks, onUpdate]);

  // --- Handlers for Editor ---

  const handleUpdateSoap = (id: string, content: string) => {
    if (isLocked) return;
    setSoapSections(prev => prev.map(s => s.id === id ? { ...s, content, lastEditedAt: new Date().toISOString() } : s));
  };

  const handleAssignRisk = (riskItem: RiskLibraryItem) => {
    if (isLocked) return;
    if (assignedRisks.some(r => r.riskLibraryItemId === riskItem.id && r.isActive)) return;

    const newRisk: AssignedRisk = {
        id: `ar-${Math.random().toString(36).substr(2, 9)}`,
        tenantId: 'tenant-demo',
        patientId: 'patient-demo',
        treatmentPlanId: visit.treatmentPlanId,
        clinicalNoteId: visit.id, // Use Visit ID as Note ID
        riskLibraryItemId: riskItem.id,
        riskLibraryVersion: riskItem.version,
        titleSnapshot: riskItem.title,
        bodySnapshot: riskItem.body,
        severitySnapshot: riskItem.severity,
        categorySnapshot: riskItem.category,
        consentMethod: 'VERBAL',
        isActive: true,
        sortOrder: assignedRisks.length,
        isExpanded: false,
        addedAt: new Date().toISOString(),
        addedByUserId: 'user-demo',
        lastUpdatedAt: new Date().toISOString()
    };
    setAssignedRisks(prev => [...prev, newRisk]);
  };

  const handleRemoveRisk = (id: string) => {
    if (isLocked) return;
    setAssignedRisks(prev => prev.map(r => r.id === id ? { ...r, isActive: false } : r));
  };

  const handleToggleRiskExpand = (id: string) => {
    setAssignedRisks(prev => prev.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r));
  };

  const handleUpdateConsent = (id: string, updates: Partial<AssignedRisk>) => {
    if (isLocked) return;
    setAssignedRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleReorderRisks = (oldIndex: number, newIndex: number) => {
     // Not implementing reorder for this MVP step, but handler required
  };

  // Pre-fill findings based on Visit items
  const handleInsertFindings = (sectionType: SoapSectionType) => {
      if (sectionType !== 'OBJECTIVE' || isLocked) return;
      const visitItems = items.filter(i => i.performedInVisitId === visit.id);
      if (visitItems.length === 0) return;

      const summary = visitItems.map(i => {
          const loc = i.selectedTeeth?.length ? `Teeth #${i.selectedTeeth.join(',')}` : i.selectedQuadrants?.length ? `${i.selectedQuadrants.join(',')} Quad` : '';
          return `- ${i.procedureName} ${loc} (${i.procedureStatus})`;
      }).join('\n');

      const section = soapSections.find(s => s.type === 'OBJECTIVE');
      if (section) {
          handleUpdateSoap(section.id, (section.content ? section.content + '\n' : '') + "Procedures for today:\n" + summary);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        {/* Visit Context Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 shrink-0 flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Clinical Note
                    {isLocked && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded border">SIGNED</span>}
                </h3>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                    <span>{new Date(visit.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{visit.provider}</span>
                    <span>•</span>
                    <span className="uppercase font-semibold">{visit.visitType}</span>
                </div>
            </div>
            {!isLocked && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => saveToVisit('draft')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Save Draft
                    </button>
                    <button 
                        onClick={() => {
                            if(confirm("Sign note? This will lock it.")) saveToVisit('signed');
                        }}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <Save size={16} /> Sign Note
                    </button>
                </div>
            )}
        </div>

        {/* Editor Wrapper */}
        <div className="flex-1 overflow-hidden relative">
            <ClinicalNoteEditor 
                soapSections={soapSections}
                onUpdateSoapSection={handleUpdateSoap}
                assignedRisks={assignedRisks}
                onAssignRisk={handleAssignRisk}
                onRemoveRisk={handleRemoveRisk}
                onToggleRiskExpand={handleToggleRiskExpand}
                onUpdateConsent={handleUpdateConsent}
                onReorderRisks={handleReorderRisks}
                suggestedRiskIds={[]} // Could infer from items
                isLocked={isLocked}
                contextLabel={`Visit Note`}
                contextSubLabel={
                    <span className="text-slate-400 text-[10px]">
                        {items.filter(i => i.performedInVisitId === visit.id).length} procedures attached
                    </span>
                }
                viewMode="page"
                showRiskPanel={showRiskPanel}
                onToggleRiskPanel={() => setShowRiskPanel(!showRiskPanel)}
                onInsertChartFindings={handleInsertFindings}
                currentTenantId="tenant-demo"
                lastSavedAt={lastSaved}
            />
        </div>
    </div>
  );
};
