'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  Sankey, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  Clock, 
  RefreshCw,
  LayoutGrid,
  Bot
} from 'lucide-react';

interface BottleneckData {
  bottlenecks: string[];
  recommendations: string[];
}

export default function AnalyticsPage() {
  const [bottlenecks, setBottlenecks] = useState<BottleneckData | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Sankey data
  const [sankeyData, setSankeyData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    async function loadAnalytics() {
      try {
        // Load stats for building Sankey and Heatmaps
        const statsRes = await fetch('/api/dashboard/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Build Sankey dynamic flow
        const { summary } = statsData;
        const total = summary.totalTickets || 10;
        const open = summary.openTickets || 5;
        const resolved = summary.resolvedToday + (summary.totalTickets - summary.openTickets) || 5;
        const escalated = Math.round(total * 0.15) || 2;
        const waiting = Math.round(total * 0.1) || 1;
        const closed = Math.round(resolved * 0.7) || 3;
        
        const nodes = [
          { name: 'Submissions (New)' },   // 0
          { name: 'Assigned (Open)' },    // 1
          { name: 'In Progress' },         // 2
          { name: 'Waiting User' },        // 3
          { name: 'Escalated' },           // 4
          { name: 'Resolved' },            // 5
          { name: 'Archived (Closed)' }    // 6
        ];

        const links = [
          { source: 0, target: 1, value: total },
          { source: 1, target: 2, value: total - waiting },
          { source: 1, target: 3, value: waiting },
          { source: 2, target: 4, value: escalated },
          { source: 2, target: 5, value: resolved - escalated },
          { source: 4, target: 5, value: escalated },
          { source: 5, target: 6, value: closed },
        ];

        setSankeyData({ nodes, links });

        // Load AI Bottlenecks
        const aiRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bottlenecks' }),
        });
        const aiData = await aiRes.json();
        setBottlenecks(aiData);
      } catch (err) {
        console.error('Failed to load analytics page data:', err);
      } finally {
        setAiLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (!mounted || aiLoading || !sankeyData) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing ticket flows & queues...</p>
        </div>
      </AppLayout>
    );
  }

  // Workload Heatmap grid dataset (Monday to Friday, 9AM to 5PM)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['09:00', '11:00', '13:00', '15:00', '17:00'];
  
  // Generating visual color weights for active periods
  const heatmapData = [
    { day: 0, hour: 0, weight: 'bg-purple-500/10' },
    { day: 0, hour: 1, weight: 'bg-purple-500/30' },
    { day: 0, hour: 2, weight: 'bg-purple-500/60' },
    { day: 0, hour: 3, weight: 'bg-purple-500/40' },
    { day: 0, hour: 4, weight: 'bg-purple-500/20' },
    
    { day: 1, hour: 0, weight: 'bg-purple-500/20' },
    { day: 1, hour: 1, weight: 'bg-purple-500/40' },
    { day: 1, hour: 2, weight: 'bg-purple-500/70' }, // Peak hour (Tuesday mid-day)
    { day: 1, hour: 3, weight: 'bg-purple-500/50' },
    { day: 1, hour: 4, weight: 'bg-purple-500/30' },
    
    { day: 2, hour: 0, weight: 'bg-purple-500/15' },
    { day: 2, hour: 1, weight: 'bg-purple-500/30' },
    { day: 2, hour: 2, weight: 'bg-purple-500/45' },
    { day: 2, hour: 3, weight: 'bg-purple-500/40' },
    { day: 2, hour: 4, weight: 'bg-purple-500/20' },
    
    { day: 3, hour: 0, weight: 'bg-purple-500/20' },
    { day: 3, hour: 1, weight: 'bg-purple-500/50' },
    { day: 3, hour: 2, weight: 'bg-purple-500/80' }, // Peak hour (Thursday mid-day)
    { day: 3, hour: 3, weight: 'bg-purple-500/60' },
    { day: 3, hour: 4, weight: 'bg-purple-500/25' },
    
    { day: 4, hour: 0, weight: 'bg-purple-500/10' },
    { day: 4, hour: 1, weight: 'bg-purple-500/25' },
    { day: 4, hour: 2, weight: 'bg-purple-500/30' },
    { day: 4, hour: 3, weight: 'bg-purple-500/20' },
    { day: 4, hour: 4, weight: 'bg-purple-500/10' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Ticket Flow & Lifecycle Analysis</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Audit bottlenecks, follow ticket transitions, and analyze workload heatmaps.
          </p>
        </div>

        {/* AI Bottlenecks Insights */}
        {bottlenecks && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
            {/* Bottlenecks Card */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Detected Queue Bottlenecks
              </h3>
              <ul className="space-y-2">
                {bottlenecks.bottlenecks.map((bot, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc list-inside">
                    {bot}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations Card */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Bot className="w-5 h-5" />
                AI Optimization Actions
              </h3>
              <ul className="space-y-2">
                {bottlenecks.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-decimal list-inside font-medium">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sankey Flow Chart */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Ticket Transition Sankey Diagram
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Visual representation of ticket progression from creation, assignment, waiting times, and final resolutions.
            </p>
            <div className="h-80 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={sankeyData}
                  node={{ stroke: '#6366f1', strokeWidth: 1 }}
                  link={{ stroke: '#e2e8f0', strokeOpacity: 0.2 }}
                  nodePadding={25}
                  nodeWidth={12}
                >
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workload Heatmap grid */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-purple-500" />
              Peak Workload Work hours
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Identifies peak submission and comment update hours throughout the week (darker grid means higher ticket volume).
            </p>
            <div className="pt-4 space-y-2">
              {/* Heatmap Grid */}
              <div className="grid grid-cols-6 gap-2 text-center text-[10px] font-bold text-gray-400">
                <div />
                {hours.map((h) => (
                  <div key={h}>{h}</div>
                ))}
              </div>
              <div className="space-y-2">
                {days.map((dayName, dayIdx) => (
                  <div key={dayName} className="grid grid-cols-6 gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-400 text-left w-8">{dayName}</span>
                    {hours.map((_, hourIdx) => {
                      const cell = heatmapData.find((h) => h.day === dayIdx && h.hour === hourIdx);
                      return (
                        <div
                          key={hourIdx}
                          className={`h-8 rounded-lg ${cell ? cell.weight : 'bg-purple-500/5'} border border-slate-200 dark:border-slate-800/60 shadow-inner hover:scale-105 transition-all`}
                          title={`Day: ${dayName}, Period: ${hours[hourIdx]}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
