import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X, Activity } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link, useLocation } = ReactRouterDOM;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Don't show layout on public share routes
  if (location.pathname.startsWith('/p/')) {
    return <>{children}</>;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Treatment Plans', path: '/' }, // Reuse root for demo
    { icon: Activity, label: 'Chairside', path: '/charting/new' },
    { icon: Users, label: 'Patients', path: '/patients' },
  ];

  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Universal Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 xl:pl-64 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg xl:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2 xl:hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-gray-900 font-bold text-lg">DentalPlan</span>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile/Tablet) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-50 backdrop-blur-sm xl:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-gray-900 font-bold text-lg">DentalPlan</span>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="text-gray-400 hover:text-gray-600 xl:hidden"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = 
                (item.path === '/' && location.pathname === '/') ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

            const Icon = item.icon;
            return (
              <React.Fragment key={item.label}>
                <Link
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              </React.Fragment>
            );
          })}
          
           <div className="pt-4 mt-4 border-t border-gray-100">
             <Link
                to="/settings"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSettingsActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings size={20} />
                Settings
              </Link>
           </div>
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button className="flex items-center gap-3 px-3 py-3 w-full text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col pt-16 xl:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};