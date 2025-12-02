
import React, { useState } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { ArrowLeft, Save, Mic, Wand2 } from 'lucide-react';

export const NotesComposer = () => {
  const { setCurrentView, addTimelineEvent } = useChairside();
  
  const [complaint, setComplaint] = useState('');
  const [assessment, setAssessment] = useState('');
  const [treatment, setTreatment] = useState('');

  const handleSave = () => {
    addTimelineEvent({
      type: 'NOTE',
      title: 'Clinical Note Added',
      details: 'Comprehensive exam & cleaning notes.',
      provider: 'Dr. Smith'
    });
    setCurrentView('DASHBOARD');
  };

  const insertAI = () => {
    setAssessment("Patient presents with localized gingivitis. No active decay noted. Oral hygiene instruction given focused on flossing technique.");
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-4xl mx-auto w-full border-x border-gray-200 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
         <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 hover:bg-gray-100 rounded-full">
               <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Clinical Notes</h2>
         </div>
         <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Save size={16} /> Save Note
         </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
         {/* Toolbar */}
         <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <Mic size={14} /> Dictate
            </button>
            <select className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                <option>Template: Standard Exam</option>
                <option>Template: Emergency</option>
                <option>Template: Post-Op</option>
            </select>
            <button onClick={insertAI} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium ml-auto">
                <Wand2 size={14} /> Insert AI Summary
            </button>
         </div>

         <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chief Complaint</label>
                <textarea 
                    value={complaint} onChange={e => setComplaint(e.target.value)}
                    className="w-full h-20 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Patient states..."
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Assessment / Diagnosis</label>
                <textarea 
                    value={assessment} onChange={e => setAssessment(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Treatment Performed</label>
                <textarea 
                    value={treatment} onChange={e => setTreatment(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Next Steps / Plan</label>
                <textarea 
                    className="w-full h-20 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="RTC for..."
                />
            </div>
         </div>
      </div>
    </div>
  );
};
