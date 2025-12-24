
import React, { useRef, useEffect } from 'react';
import { Visit, TreatmentPlanItem, ClinicalSectionId } from '../../types';
import { ReadinessInput } from '../../domain/ClaimReadinessEngine';
import { 
    ChevronDown, ChevronRight, Stethoscope, User, FileText, 
    Image, AlertCircle, ShieldAlert, CheckCircle2, Database 
} from 'lucide-react';
import { updateVisit, updateProcedureDocumentationFlags } from '../../services/treatmentPlans';

interface ClinicalContextPanelProps {
  visit: Visit;
  items: TreatmentPlanItem[];
  readinessInput: ReadinessInput | null;
  onUpdate: () => void;
  expandedSectionId: ClinicalSectionId | null;
  onToggleSection: (id: ClinicalSectionId | null) => void;
}

export const ClinicalContextPanel: React.FC<ClinicalContextPanelProps> = ({
  visit, items, readinessInput, onUpdate, expandedSectionId, onToggleSection
}) => {
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
      if (expandedSectionId && scrollRefs.current[expandedSectionId]) {
          scrollRefs.current[expandedSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Focus input if it exists
          const input = scrollRefs.current[expandedSectionId]?.querySelector('input, textarea') as HTMLElement;
          input?.focus();
      }
  }, [expandedSectionId]);

  const stats = {
      present: Object.values({
          cc: !!visit.chiefComplaint,
          hpi: !!visit.hpi,
          npi: !!readinessInput?.provider?.npi && readinessInput.provider.npi !== '0000000000',
          evidence: readinessInput?.evidence.some(e => e.attached),
      }).filter(Boolean).length,
      missing: Object.values({
          cc: !visit.chiefComplaint,
          hpi: !visit.hpi,
          npi: !readinessInput?.provider?.npi || readinessInput.provider.npi === '0000000000',
      }).filter(Boolean).length
  };

  const Section: React.FC<{ 
      id: ClinicalSectionId, 
      label: string, 
      icon: React.ElementType, 
      isMissing?: boolean,
      children: React.ReactNode 
  }> = ({ id, label, icon: Icon, isMissing, children }) => {
      const isOpen = expandedSectionId === id;
      return (
          <div 
              // FIX: Wrapped ref assignment in curly braces to satisfy RefObject expectation of returning void
              ref={el => { scrollRefs.current[id] = el; }}
              className={`border-b border-slate-100 last:border-0 transition-all ${isOpen ? 'bg-white shadow-inner py-4 px-4' : 'hover:bg-slate-50'}`}
          >
              <button 
                  onClick={() => onToggleSection(isOpen ? null : id)}
                  className="w-full flex items-center justify-between py-3 text-left group"
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isMissing ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon size={16} />
                      </div>
                      <span className={`text-sm font-bold ${isMissing ? 'text-red-700' : 'text-slate-700'}`}>{label}</span>
                      {isMissing && <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Required</span>}
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />}
              </button>
              {isOpen && <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
          </div>
      );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">Clinical Context (Supporting Facts)</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400">
                {stats.present} present · {stats.missing} missing
            </div>
        </header>

        <div className="p-0">
            <Section id="PROVIDER_ID" label="Provider & Identity" icon={User} isMissing={!readinessInput?.provider?.npi || readinessInput.provider.npi === '0000000000'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Rendering Provider NPI</label>
                        <input 
                            type="text"
                            maxLength={10}
                            placeholder="10-digit NPI"
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            value={visit.providerId ? '1234567890' : ''} // Mock linkage
                            onChange={(e) => {}} // In real app: updateProvider(e.target.value)
                        />
                    </div>
                </div>
            </Section>

            <Section id="CHIEF_COMPLAINT" label="Chief Complaint" icon={FileText} isMissing={!visit.chiefComplaint}>
                <input 
                    type="text"
                    placeholder="Enter patient's complaint..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    value={visit.chiefComplaint || ''}
                    onBlur={(e) => { updateVisit(visit.id, { chiefComplaint: e.target.value }); onUpdate(); }}
                    onChange={(e) => {}} // Local state if needed, here we use blur for minimal re-renders
                />
            </Section>

            <Section id="HPI" label="History of Present Illness (HPI)" icon={FileText} isMissing={!visit.hpi}>
                <textarea 
                    placeholder="Onset, duration, location, severity..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                    value={visit.hpi || ''}
                    onBlur={(e) => { updateVisit(visit.id, { hpi: e.target.value }); onUpdate(); }}
                    onChange={(e) => {}}
                />
            </Section>

            <Section id="FINDINGS" label="Radiographic & Clinical Findings" icon={ShieldAlert} isMissing={items.some(i => i.procedureCode.startsWith('D2')) && !visit.radiographicFindings}>
                <textarea 
                    placeholder="Describe radiolucency, fractures, etc..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                    value={visit.radiographicFindings || ''}
                    onBlur={(e) => { updateVisit(visit.id, { radiographicFindings: e.target.value }); onUpdate(); }}
                    onChange={(e) => {}}
                />
            </Section>

            <Section id="EVIDENCE" label="Evidence Attachments" icon={Image}>
                <div className="grid grid-cols-2 gap-4">
                    {items.map(item => (
                        <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 truncate">{item.procedureName}</div>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs text-slate-700">Pre-Op X-Ray</span>
                                    <input 
                                        type="checkbox" 
                                        checked={!!item.documentation?.hasXray} 
                                        onChange={(e) => { updateProcedureDocumentationFlags(item.id, { hasXray: e.target.checked }); onUpdate(); }}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs text-slate-700">Intraoral Photo</span>
                                    <input 
                                        type="checkbox" 
                                        checked={!!item.documentation?.hasPhoto} 
                                        onChange={(e) => { updateProcedureDocumentationFlags(item.id, { hasPhoto: e.target.checked }); onUpdate(); }}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section id="PROCEDURES" label="Procedural Completion" icon={Stethoscope} isMissing={items.some(i => i.procedureStatus !== 'COMPLETED')}>
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">{item.procedureCode} - {item.procedureName}</span>
                                <span className="text-[10px] text-slate-400">Diagnosis: {(item.diagnosisCodes || []).join(', ') || 'None'}</span>
                            </div>
                            <CheckCircle2 size={18} className={item.procedureStatus === 'COMPLETED' ? 'text-green-500' : 'text-slate-300'} />
                        </div>
                    ))}
                </div>
            </Section>
        </div>

        <footer className="px-6 py-4 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
            <AlertCircle size={14} className="text-blue-400" />
            <span className="text-[10px] text-blue-700 font-medium italic">
                These fields support claim readiness and contribute to medical necessity. They do not directly edit the authoritative claim narrative.
            </span>
        </footer>
    </div>
  );
};
