
import React from 'react';
import { User, Calendar } from 'lucide-react';

const MOCK_PATIENTS = [
  { id: 'p1', name: 'John Doe', dob: '1985-04-12', lastVisit: '2023-11-15' },
  { id: 'p2', name: 'Sarah Kim', dob: '1990-08-22', lastVisit: '2024-01-10' },
  { id: 'p3', name: 'Michael Tran', dob: '1978-02-05', lastVisit: '2023-09-30' },
  { id: 'p4', name: 'Emily Chen', dob: '1995-12-12', lastVisit: '2024-02-15' },
];

export const PatientListPage = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <p className="text-gray-500">Manage patient records and history.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
               <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">DOB</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Visit</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {MOCK_PATIENTS.map(p => (
                 <tr 
                    key={p.id} 
                    className="hover:bg-blue-50 transition-colors group"
                 >
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                             {p.name.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-900">{p.name}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.dob}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.lastVisit}</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
