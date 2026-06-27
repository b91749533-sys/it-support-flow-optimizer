'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Ticket, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Users, 
  TrendingUp 
} from 'lucide-react';

interface StatsSummary {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  avgResponseHours: number;
  avgResolutionHours: number;
  slaCompliance: number;
  escalationRate: number;
  reopenedCount: number;
  totalSlaBreaches: number;
}

interface ChartItem {
  id?: string;
  name: string;
  count?: number;
  openTickets?: number;
  color?: string;
}

interface DashboardData {
  summary: StatsSummary;
  charts: {
    byCategory: ChartItem[];
    byPriority: ChartItem[];
    byAgent: ChartItem[];
  };
}

const COLORS = ['#6366f1', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PRIO_COLORS: { [key: string]: string } = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const d = await res.json();
        setData(d);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (!mounted || loading || !data) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading performance metrics...</p>
        </div>
      </AppLayout>
    );
  }

  const { summary, charts } = data;

  const kpis = [
    {
      title: 'Active Open Tickets',
      value: summary.openTickets,
      desc: `${summary.totalTickets} total submissions`,
      icon: Ticket,
      color: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20',
    },
    {
      title: 'Resolved Today',
      value: summary.resolvedToday,
      desc: 'Closed and resolved',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
    },
    {
      title: 'SLA Compliance Rate',
      value: `${summary.slaCompliance}%`,
      desc: `${summary.totalSlaBreaches} breach incidents`,
      icon: Zap,
      color: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
    },
    {
      title: 'Avg Response Runtime',
      value: `${summary.avgResponseHours}h`,
      desc: 'First agent response',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20',
    },
    {
      title: 'Avg Resolution Runtime',
      value: `${summary.avgResolutionHours}h`,
      desc: 'Cycle close duration',
      icon: Clock,
      color: 'bg-sky-500/10 text-sky-500 dark:bg-sky-500/20',
    },
    {
      title: 'Escalation Rate',
      value: `${summary.escalationRate}%`,
      desc: 'Routed to level 2 support',
      icon: AlertTriangle,
      color: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20',
    },
    {
      title: 'Reopened Incidents',
      value: summary.reopenedCount,
      desc: 'Feedback reopen requests',
      icon: RefreshCw,
      color: 'bg-teal-500/10 text-teal-500 dark:bg-teal-500/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Real-Time Performance Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Overview of IT support ticket queues, SLA compliance benchmarks, and work distribution.
            </p>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {kpi.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{kpi.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Pie Chart */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Tickets by Category Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                  >
                    {charts.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Pie Chart */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Tickets by Priority</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.byPriority}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                  >
                    {charts.byPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIO_COLORS[entry.id as string] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Workload Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Agent Workload Distribution (Active Open Tickets Queue)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byAgent} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="openTickets" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {charts.byAgent.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
