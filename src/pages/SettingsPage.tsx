import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Plus, Save, Trash2, Download, Upload, RotateCcw, Users, BookOpen, 
    Shield, ShieldCheck, ChevronDown, ChevronRight, AlertCircle, FileText, X,
    Edit2, Filter, AlertTriangle, Check, Clock, ExternalLink
} from 'lucide-react';
import { listEffectiveProcedures, resolveEffectiveProcedure } from '../domain/procedureResolver';
import { 
    getClinicProcedureLibrary, saveClinicProcedureLibrary, 
    resetClinicProcedureLibraryToDefaults, mergeOrUpsertClinicProcedure 
} from '../domain/clinicProcedureLibrary';
import { exportLibraryToCsv, parseCsvToLibrary } from '../domain/procedureCsv';
import { 
    ClinicProcedure, EffectiveProcedure, Employee, EmployeeRole, 
    EmployeePermissions, FeeCategory, ProcedureUnitType 
} from '../types';
import { rehydrateAllPlans } from '../services/treatmentPlans';

// --- CONSTANTS ---
const CATEGORIES: FeeCategory[] = [
    'DIAGNOSTIC', 'PREVENTIVE', 'RESTORATIVE', 'ENDODONTIC', 'PERIO', 
    'IMPLANT', 'PROSTHETIC', 'ORTHO', 'COSMETIC', 'SURGICAL', 'OTHER'
];

const UNIT_TYPES: ProcedureUnitType[] = [
    'PER_TOOTH', 'PER_QUADRANT', 'PER_ARCH', 'FULL_MOUTH', 'PER_PROCEDURE', 'PER_VISIT', 'TIME_BASED'
];

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
    const [filterMissing, setFilterMissing] = useState(false);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProc, setEditingProc] = useState<EffectiveProcedure | null>(null);
    const [editForm, setEditForm] = useState<Partial<ClinicProcedure>>({});

    const load = () => setLib(listEffectiveProcedures());
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => lib.filter(p => {
        const matchesSearch = p.cdtCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMissing = !filterMissing || p.isLabelMissing;
        return matchesSearch && matchesMissing;
    }), [lib, searchTerm, filterMissing]);

    const handleStartEdit = (p: EffectiveProcedure) => {
        setEditingProc(p);
        const clinic = getClinicProcedureLibrary().find(c => c.cdtCode === p.cdtCode);
        setEditForm({
            cdtCode: p.cdtCode,
            displayName: p.isLabelMissing ? "" : p.displayName,
            baseFee: p.pricing.baseFee,
            membershipFee: p.pricing.membershipFee,
            categoryOverride: clinic?.categoryOverride,
            unitTypeOverride: clinic?.unitTypeOverride,
            defaultEstimatedVisits: clinic?.defaultEstimatedVisits,
            defaultEstimatedDurationValue: clinic?.defaultEstimatedDurationValue,
            defaultEstimatedDurationUnit: clinic?.defaultEstimatedDurationUnit,
            layoutOverride: clinic?.layoutOverride
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editForm.cdtCode || !editForm.displayName) {
            alert("Name and Code are required.");
            return;
        }
        mergeOrUpsertClinicProcedure(editForm as ClinicProcedure);
        setIsEditModalOpen(false);
        // Trigger global re-hydration so all active plans catch the new fees/names
        rehydrateAllPlans();
        load();
    };

    const handleDelete = (cdtCode: string) => {
        if (confirm("Remove this clinical override? Procedure will revert to system defaults.")) {
            const current = getClinicProcedureLibrary();
            saveClinicProcedureLibrary(current.filter(p => p.cdtCode !== cdtCode));
            load();
        }
    };

    const handleReset = () => {
        if (confirm("Reset clinic library to factory defaults? All custom names and pricing overrides will be lost.")) {
            resetClinicProcedureLibraryToDefaults();
            load();
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const { data, errors } = parseCsvToLibrary(text);
        if (errors.length > 0) alert(`Import issues:\n${errors.join('\n')}`);
        if (data.length > 0) {
            const current = getClinicProcedureLibrary();
            const updated = [...current];
            data.forEach(newItem => {
                const idx = updated.findIndex(c => c.cdtCode === newItem.cdtCode);
                if (idx >= 0) updated[idx] = newItem;
                else updated.push(newItem);
            });
            saveClinicProcedureLibrary(updated);
            rehydrateAllPlans();
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
        a.download = `clinic_procedure_library_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" placeholder="Search CDT code or name..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setFilterMissing(!filterMissing)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${filterMissing ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <AlertTriangle size={14} />
                        Needs Labels
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50"><Download size={14}/> Export</button>
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <Upload size={14}/> Import
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button onClick={() => { setEditingProc(null); setEditForm({}); setIsEditModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={14}/> Add New</button>
                    <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"><RotateCcw size={14}/> Reset</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Display Name / Code</th>
                            <th className="px-6 py-4 text-right">Standard Fee</th>
                            <th className="px-6 py-4 text-right">Member Fee</th>
                            <th className="px-6 py-4">Unit Scope</th>
                            <th className="px-6 py-4">Defaults</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map(p => (
                            <tr key={p.cdtCode} className="hover:bg-blue-50/30 group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`text-sm font-bold ${p.isLabelMissing ? 'text-amber-600 italic' : 'text-gray-900'}`}>
                                            {p.displayName}
                                        </div>
                                        {p.isLabelMissing && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Needs Label</span>}
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-gray-400 mt-0.5">{p.cdtCode} • {p.category}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm font-bold text-gray-900">${(p.pricing.baseFee ?? 0).toFixed(2)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm text-teal-600 font-bold">{p.pricing.membershipFee !== null ? `$${p.pricing.membershipFee.toFixed(2)}` : "-"}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{p.unitType}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                                        {p.defaults.defaultEstimatedVisits} Visit(s)
                                        {p.defaults.defaultEstimatedDurationValue && <div className="text-gray-400 mt-px">+{p.defaults.defaultEstimatedDurationValue} {p.defaults.defaultEstimatedDurationUnit}</div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleStartEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button onClick={() => handleDelete(p.cdtCode)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="py-20 text-center text-gray-400">
                        <Search size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-medium">No procedures match your criteria.</p>
                    </div>
                )}
            </div>

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{editingProc ? "Edit Procedure Override" : "Define New Procedure"}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Authoritative Library Control</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <section>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary CDT Code</label>
                                    <input 
                                        disabled={!!editingProc}
                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                        placeholder="e.g. D2391"
                                        value={editForm.cdtCode || ""}
                                        onChange={e => setEditForm({...editForm, cdtCode: e.target.value.toUpperCase()})}
                                    />
                                </section>
                                <section>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Display Name (Primary Label)</label>
                                    <input 
                                        autoFocus
                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Human-friendly label..."
                                        value={editForm.displayName || ""}
                                        onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                                    />
                                </section>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Pricing Structure</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Standard Base Fee ($)</label>
                                            <input 
                                                type="number"
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                                value={editForm.baseFee ?? ""}
                                                onChange={e => setEditForm({...editForm, baseFee: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Membership Rate ($)</label>
                                            <input 
                                                type="number"
                                                placeholder="Leave blank for Standard fallback"
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                                value={editForm.membershipFee ?? ""}
                                                onChange={e => setEditForm({...editForm, membershipFee: e.target.value === "" ? null : parseFloat(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Clinical Behavior</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                                            <select 
                                                className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                                value={editForm.categoryOverride || editingProc?.category || "OTHER"}
                                                onChange={e => setEditForm({...editForm, categoryOverride: e.target.value as any})}
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Unit Scope</label>
                                            <select 
                                                className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                                value={editForm.unitTypeOverride || editingProc?.unitType || "PER_PROCEDURE"}
                                                onChange={e => setEditForm({...editForm, unitTypeOverride: e.target.value as any})}
                                            >
                                                {UNIT_TYPES.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <section className="bg-gray-50 p-4 rounded-xl space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12}/> Defaults for Timeline
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Est. Visits</label>
                                        <input 
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={editForm.defaultEstimatedVisits ?? ""}
                                            onChange={e => setEditForm({...editForm, defaultEstimatedVisits: parseInt(e.target.value) || 1})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Interval Value</label>
                                        <input 
                                            type="number"
                                            placeholder="e.g. 2"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={editForm.defaultEstimatedDurationValue ?? ""}
                                            onChange={e => setEditForm({...editForm, defaultEstimatedDurationValue: parseFloat(e.target.value) || undefined})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Interval Unit</label>
                                        <select 
                                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                            value={editForm.defaultEstimatedDurationUnit || ""}
                                            onChange={e => setEditForm({...editForm, defaultEstimatedDurationUnit: e.target.value as any || undefined})}
                                        >
                                            <option value="">None</option>
                                            <option value="days">Days</option>
                                            <option value="weeks">Weeks</option>
                                            <option value="months">Months</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <footer className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-8 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                                <Check size={18}/> Commit to Library
                            </button>
                        </footer>
                    </div>
                </div>
            )}
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
        if (confirm("Delete this employee profile?")) {
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
                    <h3 className="font-bold text-gray-900">Active Staff Directory</h3>
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
                                <button onClick={() => { setEditingId(e.id); setForm(e); }} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                                <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
                            <Users size={48} className="opacity-10"/>
                            <p className="text-sm font-medium">Directory is empty.</p>
                        </div>
                    )}
                </div>
            </div>

            {(isAdding || editingId) && (
                <div className="w-[400px] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
                    <header className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">{editingId ? "Edit Profile" : "Register Employee"}</h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">First Name</label>
                            <input value={form.firstName || ""} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Last Name</label>
                            <input value={form.lastName || ""} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/></div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Staff Role</label>
                            <select value={form.role || ""} onChange={e => applyRolePreset(e.target.value as EmployeeRole)} className="w-full p-2 border rounded-lg text-sm bg-white">
                                {Object.keys(ROLE_PRESETS).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 flex items-center gap-2"><Shield size={14}/> Access Control</h4>
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
                        {/* FIX: Corrected invalid onClick syntax from handleSave} to onClick={handleSave} to resolve parser errors. */}
                        <button onClick={handleSave} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all">Save Changes</button>
                    </footer>
                </div>
            )}
        </div>
    );
};