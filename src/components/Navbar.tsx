'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, User, LogOut, ShieldAlert, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  ticketId: string | null;
  createdAt: string;
}

interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  departmentName: string | null;
}

export default function Navbar() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch User Session
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Session load fail:', err);
      }
    }

    // Fetch Notifications
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error('Notifications load fail:', err);
      }
    }

    fetchSession();
    fetchNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="glass-panel sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between border-b shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
          IT Support Flow Optimizer
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Icon and Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white pulse-red">
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-slide-up z-50">
              <div className="p-3 border-b bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-600 hover:underline dark:text-purple-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.ticketId) router.push(`/tickets/${notif.ticketId}`);
                      }}
                      className={`p-3 border-b text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                        !notif.isRead ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.type === 'SLA_BREACH' ? (
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <Award className="w-4 h-4 text-purple-500 shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {notif.title}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                            {notif.message}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* User Profile Menu */}
        {user && (
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="hidden md:flex flex-col items-start text-xs">
                <span className="font-semibold">{user.firstName} {user.lastName}</span>
                <span className="text-gray-500 dark:text-gray-400 capitalize">{user.role.toLowerCase()}</span>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-slide-up z-50">
                <div className="p-3 border-b bg-gray-50 dark:bg-slate-800/50">
                  <div className="font-semibold text-sm">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                  {user.departmentName && (
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                      {user.departmentName}
                    </div>
                  )}
                </div>
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
