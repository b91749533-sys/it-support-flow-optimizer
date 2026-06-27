'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertOctagon, 
  User, 
  Clock, 
  ChevronRight, 
  CheckCircle,
  HelpCircle,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

interface MetaData {
  departments: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  priorities: { id: string; name: string; color: string }[];
  statuses: string[];
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priorityId: string;
  categoryId: string;
  createdAt: string;
  priority: { name: string; color: string };
  category: { name: string };
  createdBy: { firstName: string; lastName: string };
  assignedTo: { firstName: string; lastName: string } | null;
  department: { name: string };
  slaResolutionBreached: boolean;
  slaResponseBreached: boolean;
}

const PRIO_COLORS: { [key: string]: string } = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function TicketsPage() {
  // Lists
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [session, setSession] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [agentId, setAgentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Create Ticket Modal Form
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newPrio, setNewPrio] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // AI recommendations in create modal
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResolutionPrediction, setAiResolutionPrediction] = useState<string | null>(null);
  const [aiAgentRecommendation, setAiAgentRecommendation] = useState<string | null>(null);
  const [aiAgentRecId, setAiAgentRecId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch Session & Meta
  useEffect(() => {
    async function loadMeta() {
      try {
        const [metaRes, agentsRes, sessionRes] = await Promise.all([
          fetch('/api/meta'),
          fetch('/api/users?role=AGENT'),
          fetch('/api/auth/session'),
        ]);
        const m = await metaRes.json();
        const a = await agentsRes.json();
        const s = await sessionRes.json();
        setMeta(m);
        setAgents(a.users || []);
        setSession(s.user);
      } catch (err) {
        console.error('Failed to load filters metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Tickets based on filters
  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (category) params.append('category', category);
      if (department) params.append('departmentId', department);
      if (agentId) params.append('agentId', agentId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [status, priority, category, department, agentId, startDate, endDate]);

  // Handle Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc || !newCat || !newPrio || !newDept) return;

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          categoryId: newCat,
          priorityId: newPrio,
          departmentId: newDept,
          assignedToId: newAssignee || undefined,
          dueDate: newDueDate || undefined,
        }),
      });

      if (res.ok) {
        // Reset form and reload list
        setNewTitle('');
        setNewDesc('');
        setNewCat('');
        setNewPrio('');
        setNewDept('');
        setNewAssignee('');
        setNewDueDate('');
        setAiResolutionPrediction(null);
        setAiAgentRecommendation(null);
        setModalOpen(false);
        loadTickets();
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  // Get AI recommendations
  const getAIRecommendations = async () => {
    if (!newTitle || !newDesc || !newCat || !newPrio) {
      alert('Please fill Title, Description, Category, and Priority first to run AI calculations.');
      return;
    }
    setAiLoading(true);
    setAiResolutionPrediction(null);
    setAiAgentRecommendation(null);
    setAiAgentRecId(null);

    try {
      // 1. Predict Resolution Time
      const predRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'predict-resolution',
          title: newTitle,
          description: newDesc,
          categoryId: newCat,
          priorityId: newPrio,
        }),
      });
      const predData = await predRes.json();
      setAiResolutionPrediction(`${predData.hours} hours (${predData.confidence} Confidence) - ${predData.reasoning}`);

      // 2. Recommend Agent Assignment
      const recRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend-agent',
          title: newTitle,
          description: newDesc,
          categoryId: newCat,
        }),
      });
      const recData = await recRes.json();
      setAiAgentRecommendation(`${recData.agentName} - ${recData.reasoning}`);
      setAiAgentRecId(recData.agentId);

      // Auto-fill assignment if approved
      if (recData.agentId) {
        setNewAssignee(recData.agentId);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'NEW': return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
      case 'OPEN': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      case 'WAITING_FOR_USER': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      case 'ESCALATED': return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'CLOSED': return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Title bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">IT Support Tickets</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submit and process tickets, assign agents, and monitor SLAs.
            </p>
          </div>
          {session && ['ADMIN', 'MANAGER', 'AGENT'].includes(session.role) && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wide shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Support Ticket
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 mb-2 dark:border-slate-800">
            <Filter className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Filter Support Queue</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search ticket title/desc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 outline-none"
              />
            </div>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
            >
              <option value="">All Statuses</option>
              {meta?.statuses.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
            >
              <option value="">All Priorities</option>
              {meta?.priorities.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
            >
              <option value="">All Categories</option>
              {meta?.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Department */}
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
            >
              <option value="">All Departments</option>
              {meta?.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Agent */}
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>

            {/* Dates */}
            <div className="flex gap-2 items-center col-span-1 lg:col-span-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t dark:border-slate-800 gap-2">
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setPriority('');
                setCategory('');
                setDepartment('');
                setAgentId('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-gray-500 hover:text-slate-700 hover:underline px-3 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={loadTickets}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Tickets Grid/List */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 flex flex-col gap-2 items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
              Loading tickets log...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No tickets match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase border-b dark:border-slate-800">
                    <th className="p-4">Ticket</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">SLA status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-white truncate">{ticket.title}</div>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                          <span>#{ticket.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span>By {ticket.createdBy.firstName} {ticket.createdBy.lastName}</span>
                          <span>•</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeClass(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                          style={{ backgroundColor: PRIO_COLORS[ticket.priorityId] || '#6b7280' }}
                        >
                          {ticket.priority.name}
                        </span>
                      </td>
                      <td className="p-4 capitalize">{ticket.category.name}</td>
                      <td className="p-4 font-medium">{ticket.department.name}</td>
                      <td className="p-4">
                        {ticket.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-[9px]">
                              {ticket.assignedTo.firstName[0]}{ticket.assignedTo.lastName[0]}
                            </div>
                            <span className="font-medium">
                              {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        {ticket.slaResolutionBreached || ticket.slaResponseBreached ? (
                          <div className="flex items-center gap-1 text-red-500 font-bold">
                            <AlertOctagon className="w-4 h-4 shrink-0 pulse-red rounded-full" />
                            <span>BREACH</span>
                          </div>
                        ) : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                          <div className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>Compliant</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Active</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 font-semibold cursor-pointer"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Ticket Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
              <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-500" />
                  Submit New IT Ticket
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Ticket Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. My laptop screen is flickering"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Description of issue
                    </label>
                    <textarea
                      required
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={3}
                      placeholder="Provide all details, error codes, and steps to reproduce..."
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      required
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">Select Category</option>
                      {meta?.categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Priority
                    </label>
                    <select
                      required
                      value={newPrio}
                      onChange={(e) => setNewPrio(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">Select Priority</option>
                      {meta?.priorities.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Target Department
                    </label>
                    <select
                      required
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">Select Department</option>
                      {meta?.departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    />
                  </div>

                  {session && ['ADMIN', 'MANAGER'].includes(session.role) && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Assign Directly to Support Agent
                      </label>
                      <select
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* AI Suggestions Box inside Create Form */}
                <div className="p-4 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-bold">
                      <TrendingDown className="w-4 h-4 rotate-180" />
                      <span>AI Smart Copilot Insights</span>
                    </div>
                    <button
                      type="button"
                      onClick={getAIRecommendations}
                      disabled={aiLoading}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shadow-inner cursor-pointer"
                    >
                      {aiLoading ? 'Calculating...' : 'Run Copilot Recommendations'}
                    </button>
                  </div>

                  {aiResolutionPrediction && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Predicted Close Time:</span> {aiResolutionPrediction}
                    </div>
                  )}

                  {aiAgentRecommendation && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Recommended Specialist:</span> {aiAgentRecommendation}
                    </div>
                  )}

                  {!aiResolutionPrediction && !aiAgentRecommendation && (
                    <p className="text-[10px] text-gray-400">
                      Predict resolution time and get optimal assignment recommendations using real AI models.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow cursor-pointer"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
