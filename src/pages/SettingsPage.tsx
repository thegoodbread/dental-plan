import React, { useState, useEffect, useMemo } from 'react';
// FIX: Added X to lucide-react imports for closing editing modes
import { Search, Plus, Save, Trash2, Download, Upload, RotateCcw, Users, BookOpen, Shield, ShieldCheck, ChevronDown, ChevronRight, AlertCircle, FileText, X } from 'lucide-react';
import { listEffectiveProcedures, resolveEffectiveProcedure } from '../domain/procedureResolver';
import { getClinicProcedureLibrary, saveClinicProcedureLibrary, resetClinicProcedureLibraryToDefaults, mergeOrUpsertClinicProcedure } from '../domain/clinicProcedureLibrary';
import { exportLibraryToCsv, parseCsvToLibrary } from '../domain/procedureCsv';
import { ClinicProcedure, EffectiveProcedure, Employee, EmployeeRole, EmployeePermissions } from '../types';

// --- EMPLOYEE STORAGE ---
const KEY_EMPLOYEES = "cc_employees_v1";
const ROLE_PRESETS: Record<EmployeeRole, EmployeePermissions> = {
    Dentist: { canEditPlans: true, canEditFees: false, canPresentPlans: true, canViewClaimsGuide: true, canEditClinicalNotes: true, canManageEmployees: false, canExportData: false },
    Hygienist: { canEditPlans: false, canEditFees: false, canPresentPlans: true, canViewClaimsGuide: true, canEditClinicalNotes: true, canManageEmployees: false, canExportData: false },
    OfficeManager: { canEditPlans: true, canEditFees: true, canPresentPlans: true, canViewClaimsGuide: true, canEditClinicalNotes: false, canManageEmployees: true, canExportData: true },
    Assistant: { canEditPlans: false, canEditFees: false, canPresentPlans: false, canViewClaimsGuide: true, canEditClinicalNotes: true, canManageEmployees: false, canExportData: false },
    FrontDesk: { canEditPlans: false, canEditFees: false, canPresentPlans: true, canViewClaimsGuide: false, canEditClinicalNotes: false, canManageEmployees: false, canExportData: false },
    Billing: { canEditPlans: false, canEditFees: true, canPresentPlans: false, canViewClaimsGuide: true, canEditClinicalNotes: false, canManageEmployees: false, canExportData: true },
    Admin: { canEditPlans: true, canEditFees: true, canPresentPlans: true, canViewClaimsGuide: true, canEditClinicalNotes: true, canManageEmployees: true, canExportData: true }
};

export const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LIBRARY' | 'EMPLOYEES'>('LIBRARY');

    useEffect(() => {
        console.debug("[Settings] mounted");
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Clinic Configuration</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your professional catalog and staff permissions.</p>
                
                <div className="flex gap-6 mt-6">
                    <button 
                        onClick={() => setActiveTab('LIBRARY')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'LIBRARY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <BookOpen size={18} /> Procedure Library
                    </button>
                    <button 
                        onClick={() => setActiveTab('EMPLOYEES')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'EMPLOYEES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users size={18} /> Employees
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-8">
                <div className="max-w-7xl mx-auto h-full flex flex-col">
                    {activeTab === 'LIBRARY' ? <ProcedureLibraryModule /> : <EmployeeDirectoryModule />}
                </div>
            </div>
        </div>
    );
};

// --- PROCEDURE LIBRARY MODULE ---
const ProcedureLibraryModule = () => {
    const [lib, setLib] = useState<EffectiveProcedure[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ClinicProcedure>>({});

    const load = () => setLib(listEffectiveProcedures());
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => lib.filter(p => 
        p.cdtCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [lib, searchTerm]);

    const handleStartEdit = (p: EffectiveProcedure) => {
        setEditingCode(p.cdtCode);
        setEditForm({ cdtCode: p.cdtCode, displayName: p.displayName, baseFee: p.pricing.baseFee, membershipFee: p.pricing.membershipFee });
    };

    const handleSaveEdit = () => {
        if (!editForm.cdtCode) return;
        mergeOrUpsertClinicProcedure(editForm as ClinicProcedure);
        setEditingCode(null);
        load();
    };

    const handleReset = () => {
        if (confirm("Reset library to factory defaults? All custom pricing will be lost.")) {
            resetClinicProcedureLibraryToDefaults();
            load();
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const { data, errors } = parseCsvToLibrary(text);
        if (errors.length > 0) alert(`Import had errors:\n${errors.join('\n')}`);
        if (data.length > 0) {
            saveClinicProcedureLibrary(data);
            load();
        }
    };

    const handleExport = () => {
        const clinicData = getClinicProcedureLibrary();
        const csv = exportLibraryToCsv(clinicData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinic_fees_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" placeholder="Search CDT code or name..." 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50"><Download size={14}/> Export</button>
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <Upload size={14}/> Import CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"><RotateCcw size={14}/> Reset</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">CDT Code</th>
                            <th className="px-6 py-4">Display Name</th>
                            <th className="px-6 py-4 text-right">Base Fee</th>
                            <th className="px-6 py-4 text-right">Member Fee</th>
                            <th className="px-6 py-4">Scope</th>
                            <th className="px-6 py-4">Coverage</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map(p => (
                            <tr key={p.cdtCode} className="hover:bg-blue-50/30 group">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">{p.cdtCode}</td>
                                <td className="px-6 py-4">
                                    {editingCode === p.cdtCode ? (
                                        <input 
                                            value={editForm.displayName || ""} 
                                            onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                                            className="w-full p-1 border border-blue-400 rounded text-sm"
                                        />
                                    ) : (
                                        <div className="text-sm font-bold text-gray-900">{p.displayName}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingCode === p.cdtCode ? (
                                        <input 
                                            type="number" value={editForm.baseFee || 0} 
                                            onChange={e => setEditForm({...editForm, baseFee: parseFloat(e.target.value) || 0})}
                                            className="w-24 p-1 border border-blue-400 rounded text-sm text-right"
                                        />
                                    ) : (
                                        <div className="text-sm font-bold text-gray-900">${p.pricing.baseFee.toFixed(2)}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingCode === p.cdtCode ? (
                                        <input 
                                            type="number" value={editForm.membershipFee || ""} 
                                            onChange={e => setEditForm({...editForm, membershipFee: e.target.value ? parseFloat(e.target.value) : null})}
                                            className="w-24 p-1 border border-blue-400 rounded text-sm text-right"
                                        />
                                    ) : (
                                        <div className="text-sm text-teal-600 font-bold">{p.pricing.membershipFee ? `$${p.pricing.membershipFee.toFixed(2)}` : "-"}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{p.unitType}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {p.metaCoverage === 'full' ? (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit"><ShieldCheck size={10}/> CLINICAL RULES</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full w-fit">GENERIC</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingCode === p.cdtCode ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSaveEdit} className="p-1.5 text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 transition-all"><Save size={16}/></button>
                                            <button onClick={() => setEditingCode(null)} className="p-1.5 text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 transition-all"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Plus size={16}/></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- EMPLOYEE DIRECTORY MODULE ---
const EmployeeDirectoryModule = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Employee>>({});

    const load = () => {
        const stored = localStorage.getItem(KEY_EMPLOYEES);
        setEmployees(stored ? JSON.parse(stored) : []);
    };
    useEffect(() => { load(); }, []);

    const handleSave = () => {
        const newList = editingId 
            ? employees.map(e => e.id === editingId ? { ...e, ...form } as Employee : e)
            : [...employees, { id: `emp_${Date.now()}`, ...form } as Employee];
        
        localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(newList));
        setEmployees(newList);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Delete this employee? This will revoke their access.")) {
            const newList = employees.filter(e => e.id !== id);
            localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(newList));
            setEmployees(newList);
        }
    };

    const applyRolePreset = (role: EmployeeRole) => {
        setForm({ ...form, role, permissions: ROLE_PRESETS[role] });
    };

    return (
        <div className="flex gap-8 h-full overflow-hidden">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Active Staff</h3>
                    <button onClick={() => { setIsAdding(true); setForm({ role: 'Assistant', permissions: ROLE_PRESETS.Assistant }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Plus size={16}/> Add Employee
                    </button>
                </div>
                <div className="divide-y divide-gray-100">
                    {employees.map(e => (
                        <div key={e.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                                    {e.firstName[0]}{e.lastName[0]}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{e.firstName} {e.lastName}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                        <span className="font-bold text-blue-600 uppercase tracking-widest">{e.role}</span>
                                        {e.clinicalSettings?.licenseNumber && <span>• Lic: {e.clinicalSettings.licenseNumber}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setEditingId(e.id); setForm(e); }} className="p-2 text-gray-400 hover:text-blue-600"><Plus size={18}/></button>
                                <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
                            <Users size={48} className="opacity-10"/>
                            <p className="text-sm font-medium">No employees registered yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {(isAdding || editingId) && (
                <div className="w-[400px] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
                    <header className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">{editingId ? "Edit Employee" : "New Employee"}</h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">First Name</label>
                            <input value={form.firstName || ""} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Last Name</label>
                            <input value={form.lastName || ""} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/></div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Role Profile</label>
                            <select value={form.role || ""} onChange={e => applyRolePreset(e.target.value as EmployeeRole)} className="w-full p-2 border rounded-lg text-sm bg-white">
                                {Object.keys(ROLE_PRESETS).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 flex items-center gap-2"><Shield size={14}/> Access Permissions</h4>
                            {form.permissions && Object.entries(form.permissions).map(([key, val]) => (
                                <label key={key} className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs text-gray-700 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <input type="checkbox" checked={val} onChange={e => setForm({...form, permissions: {...form.permissions!, [key]: e.target.checked}})} className="w-4 h-4 rounded text-blue-600"/>
                                </label>
                            ))}
                        </div>
                    </div>
                    <footer className="p-6 border-t border-gray-100 flex gap-3">
                        <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="flex-1 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">Cancel</button>
                        <button onClick={handleSave} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all">Save Profile</button>
                    </footer>
                </div>
            )}
        </div>
    );
};