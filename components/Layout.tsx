import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't show layout on public share routes
  if (location.pathname.startsWith('/p/')) {
    return <>{children}</>;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Treatment Plans', path: '/' }, // Reuse root for demo
    { icon: Users, label: 'Patients', path: '/patients' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <span className="text-gray-900 font-bold text-lg">DentalPlan</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-50 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-gray-900 font-bold text-lg">DentalPlan</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center gap-3 px-3 py-3 w-full text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
};