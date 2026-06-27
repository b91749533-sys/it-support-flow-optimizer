'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Ticket, 
  TrendingUp, 
  FileSpreadsheet, 
  Settings,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface UserSession {
  role: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function getSessionRole() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          setRole(data.user.role);
        }
      } catch (err) {
        console.error('Failed to get session role:', err);
      }
    }
    getSessionRole();
  }, []);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['ADMIN', 'MANAGER', 'AGENT'],
    },
    {
      name: 'Tickets',
      icon: Ticket,
      path: '/tickets',
      roles: ['ADMIN', 'MANAGER', 'AGENT'],
    },
    {
      name: 'Flow Analysis',
      icon: TrendingUp,
      path: '/analytics',
      roles: ['ADMIN', 'MANAGER', 'AGENT'],
    },
    {
      name: 'Reports & Audits',
      icon: FileSpreadsheet,
      path: '/reports',
      roles: ['ADMIN', 'MANAGER'],
    },
  ];

  const activeLinkClass = 'flex items-center gap-3 px-4 py-3 bg-purple-600 text-white rounded-xl shadow-md transition-all';
  const inactiveLinkClass = 'flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-slate-800/50 rounded-xl transition-all';

  return (
    <aside className="w-64 border-r bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 h-[calc(100vh-80px)]">
      <div className="p-4 flex flex-col gap-6">
        {/* Navigation Section */}
        <nav className="flex flex-col gap-1.5">
          {menuItems
            .filter((item) => role && item.roles.includes(role))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={isActive ? activeLinkClass : inactiveLinkClass}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
        </nav>

        {/* Admin Panels for Admins Only */}
        {role === 'ADMIN' && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            <span className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              System Administration
            </span>
            <Link
              href="/admin/users"
              className={pathname.startsWith('/admin/users') ? activeLinkClass : inactiveLinkClass}
            >
              <UserCheck className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Manage Users</span>
            </Link>
          </div>
        )}
      </div>

      {/* Signature Footer */}
      <div className="p-4 border-t bg-gray-50/50 dark:bg-slate-800/20 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Flow Optimizer</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          made by <span className="font-semibold text-gray-600 dark:text-gray-300">Youssef Manssouri</span>
        </p>
      </div>
    </aside>
  );
}
