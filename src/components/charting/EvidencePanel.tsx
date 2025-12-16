
import React from 'react';
import { Camera, FileImage, Upload, CheckCircle2, AlertCircle, AlertTriangle, Plus } from 'lucide-react';
import { MissingItem, EvidenceMissingItem } from '../../domain/ClaimReadinessEngine';

interface EvidencePanelProps {
  missingEvidence: MissingItem[];
  // Mock attach handler for demo
  onAttach: (type: string, procedureId?: string) => void;
}

const EVIDENCE_LABELS: Record<string, string> = {
    'pre_op_xray': 'Pre-Op X-Ray',
    'fmX_pano_recent': 'FMX / Pano',
    'intraoral_photo': 'Intraoral Photo',
    'perio_charting': 'Perio Chart',
    'other': 'Other Attachment'
};

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ missingEvidence, onAttach }) => {
  const evidenceBlockers = missingEvidence.filter((m): m is EvidenceMissingItem => 
      m.kind === 'evidence' && m.severity === 'blocker'
  );
  const evidenceWarnings = missingEvidence.filter((m): m is EvidenceMissingItem => 
      m.kind === 'evidence' && m.severity === 'warning'
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Sticky Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white z-10">
        <div className="flex items-center gap-2 mb-1">
            <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                <Camera size={16} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">Evidence</h3>
            </div>
        </div>
        <p className="text-[10px] text-slate-400">
            {evidenceBlockers.length} required items missing for claim submission.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
         {/* Required Section */}
         {evidenceBlockers.length > 0 && (
             <div>
                 <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <AlertCircle size={10} /> Required
                 </h4>
                 <div className="space-y-2">
                     {evidenceBlockers.map((item, idx) => (
                         <div key={idx} className="bg-white border border-red-200 rounded-lg p-3 shadow-sm">
                             <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-bold text-slate-800">{EVIDENCE_LABELS[item.evidenceType] || item.label}</span>
                                 <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 uppercase font-bold">Missing</span>
                             </div>
                             <p className="text-[10px] text-slate-500 mb-3">
                                 Required for procedure {item.procedureId ? 'billing' : 'clearance'}.
                             </p>
                             <button 
                                onClick={() => onAttach(item.evidenceType, item.procedureId)}
                                className="w-full py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                             >
                                 <Upload size={12} /> Attach
                             </button>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* Warnings Section */}
         {evidenceWarnings.length > 0 && (
             <div>
                 <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <AlertTriangle size={10} /> Recommended
                 </h4>
                 <div className="space-y-2">
                     {evidenceWarnings.map((item, idx) => (
                         <div key={idx} className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm border-dashed">
                             <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-bold text-slate-800">{EVIDENCE_LABELS[item.evidenceType] || item.label}</span>
                                 <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase font-bold">Optional</span>
                             </div>
                             <button 
                                onClick={() => onAttach(item.evidenceType, item.procedureId)}
                                className="w-full py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                             >
                                 <Plus size={12} /> Add
                             </button>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* Empty State if everything is good */}
         {evidenceBlockers.length === 0 && evidenceWarnings.length === 0 && (
             <div className="text-center py-12">
                 <div className="inline-flex p-3 bg-green-50 rounded-full text-green-500 mb-3">
                     <CheckCircle2 size={24} />
                 </div>
                 <p className="text-xs font-medium text-slate-600">All evidence requirements met.</p>
             </div>
         )}
      </div>
    </div>
  );
};
