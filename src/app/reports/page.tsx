'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Calendar, 
  CheckCircle,
  Users,
  Building,
  ShieldCheck,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('monthly'); // monthly, agent, sla, department
  const [format, setFormat] = useState('excel'); // excel, csv, pdf
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    try {
      const url = `/api/reports/export?type=${reportType}&format=${format}`;
      // Open in a new tab or trigger native browser download
      window.open(url, '_blank');
    } catch (e) {
      console.error('Failed to trigger report export:', e);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const reportsList = [
    {
      type: 'monthly',
      title: 'Monthly Ticket Volume Report',
      desc: 'Creation vs. resolution counts, status breakdowns, and overall backlog trends over the past 30 days.',
      icon: Calendar,
      color: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20',
    },
    {
      type: 'agent',
      title: 'Agent Performance Leaderboard',
      desc: 'Individual agent metrics: total tickets resolved, average cycle times, and SLA compliance percentages.',
      icon: Users,
      color: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
    },
    {
      type: 'sla',
      title: 'SLA Violations & Audits Log',
      desc: 'Detailed log auditing target response breaches, target resolution breaches, and overall compliance rates.',
      icon: ShieldCheck,
      color: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
    },
    {
      type: 'department',
      title: 'Department Workload Metrics',
      desc: 'Analyzes ticket volumes and escalation counts grouped by operational business departments.',
      icon: Building,
      color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">IT Support Reports & Audits Hub</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate and export CSV, Excel, and PDF performance audits for stakeholders.
          </p>
        </div>

        {/* Builder card */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Export Configurations
            </h3>

            {/* Select Report */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                Select Audit Report
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
              >
                <option value="monthly">Monthly Ticket Volume Report</option>
                <option value="agent">Agent Performance Leaderboard</option>
                <option value="sla">SLA Violations & Audits Log</option>
                <option value="department">Department Workload Metrics</option>
              </select>
            </div>

            {/* Select Format */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                File Export Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
              >
                <option value="excel">Microsoft Excel (.xlsx)</option>
                <option value="csv">Comma Separated Values (.csv)</option>
                <option value="pdf">Printable Document (.pdf)</option>
              </select>
            </div>

            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Export Document
                </>
              )}
            </button>
          </div>

          {/* Icon visual */}
          <div className="flex flex-col items-center justify-center bg-purple-500/5 dark:bg-purple-950/5 border border-purple-500/10 rounded-2xl p-8 text-center h-full">
            {format === 'excel' ? (
              <FileSpreadsheet className="w-16 h-16 text-emerald-500 animate-bounce" />
            ) : (
              <FileText className="w-16 h-16 text-purple-500 animate-bounce" />
            )}
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-4 capitalize">
              {format} Format Selected
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[200px]">
              Ready for immediate spreadsheet audits, data backups, or print distributions.
            </p>
          </div>
        </div>

        {/* Details list of templates */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Available Report Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportsList.map((rep) => {
              const Icon = rep.icon;
              return (
                <div
                  key={rep.type}
                  onClick={() => setReportType(rep.type)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex gap-4 text-xs ${
                    reportType === rep.type
                      ? 'bg-purple-500/5 border-purple-500 dark:bg-purple-950/15'
                      : 'bg-white dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${rep.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 dark:text-white">{rep.title}</h4>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{rep.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
