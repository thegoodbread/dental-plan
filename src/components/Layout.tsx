import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link, useLocation } = ReactRouterDOM;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (location.pathname.startsWith('/p/')) {
    return <>{children}</>;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Treatment Plans', path: '/' },
    { icon: Users, label: 'Patients', path: '/patients' },
  ];

  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 xl:pl-64">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg xl:hidden">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 backdrop-blur-sm xl:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">DentalPlan Pro</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = (item.path === '/' && location.pathname === '/') || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.path} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={20} /> {item.label}
              </Link>
            );
          })}
          <div className="pt-4 mt-4 border-t border-gray-100">
             <Link to="/settings" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${isSettingsActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings size={20} /> Settings
              </Link>
           </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col pt-16 xl:ml-64">
        {children}
      </main>
    </div>
  );
};