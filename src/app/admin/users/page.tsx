'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  UserCheck, 
  RefreshCw, 
  Shield, 
  Building,
  Mail,
  User
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  departmentId: string | null;
  departmentName?: string | null;
}

interface Meta {
  departments: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Load users and departments metadata
  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, metaRes, sessionRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/meta'),
          fetch('/api/auth/session'),
        ]);

        const uData = await usersRes.json();
        const mData = await metaRes.json();
        const sData = await sessionRes.json();

        setUsers(uData.users || []);
        setDepartments(mData.departments || []);
        setSession(sData.user);
      } catch (err) {
        console.error('Failed to load user management details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update user role or department in DB
  const handleUpdateUser = async (userId: string, field: string, value: string | null) => {
    try {
      const res = await fetch(`/api/auth/register`, { // We can build a quick update endpoint or modify the auth register route or create an api/users/[id] route
        // Wait, since we need to change role/dept, let's create a quick API endpoint `/api/users/[id]/route.ts` or handle it in `/api/users` PATCH.
        // Let's create `/api/users/[id]/route.ts` for updating users! That is extremely clean.
      });
      
      const updateRes = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (updateRes.ok) {
        // Refresh list
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to update user:', e);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading user registry...</p>
        </div>
      </AppLayout>
    );
  }

  if (!session || session.role !== 'ADMIN') {
    return (
      <AppLayout>
        <div className="p-6 text-center text-red-500 font-semibold">
          Access Denied. You must be a System Administrator to view this page.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-500" />
            User Access Control Registry
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage roles, adjust permissions, and re-assign departments.
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase border-b dark:border-slate-800">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Security Role</th>
                  <th className="p-4">Assigned Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {u.firstName} {u.lastName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                        <select
                          value={u.roleId}
                          onChange={(e) => handleUpdateUser(u.id, 'roleId', e.target.value)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none font-medium"
                        >
                          <option value="ADMIN">Administrator</option>
                          <option value="MANAGER">Manager</option>
                          <option value="AGENT">Support Agent</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-purple-500 shrink-0" />
                        <select
                          value={u.departmentId || ''}
                          onChange={(e) => handleUpdateUser(u.id, 'departmentId', e.target.value || null)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none font-medium"
                        >
                          <option value="">Unassigned</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
