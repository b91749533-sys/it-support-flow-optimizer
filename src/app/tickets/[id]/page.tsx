'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MessageSquare, 
  History, 
  Sparkles, 
  ShieldAlert, 
  RefreshCw,
  AlertTriangle,
  FolderSync
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priorityId: string;
  categoryId: string;
  departmentId: string;
  assignedToId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  priority: { name: string; color: string };
  category: { name: string };
  createdBy: { firstName: string; lastName: string; email: string };
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  department: { name: string };
  slaResolutionBreached: boolean;
  slaResponseBreached: boolean;
  slaResponseLimit: string;
  slaResolutionLimit: string;
}

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string; roleId: string; email: string };
}

interface Activity {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

interface Meta {
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

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Data state
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [session, setSession] = useState<any>(null);

  // Form state
  const [commentContent, setCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // AI state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiRecurringChecked, setAiRecurringChecked] = useState(false);
  const [aiRecurringData, setAiRecurringData] = useState<{ isRecurring: boolean; incidentGroup?: string; confidence: string; reasoning: string } | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch Session & Meta data
  useEffect(() => {
    async function loadMetaAndSession() {
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
        console.error('Failed to load detail metadata:', err);
      }
    }
    loadMetaAndSession();
  }, []);

  // Fetch Ticket details
  const loadTicketData = async () => {
    try {
      const [ticketRes, commentsRes, activitiesRes] = await Promise.all([
        fetch(`/api/tickets/${id}`),
        fetch(`/api/tickets/${id}/comments`),
        fetch(`/api/tickets/${id}/activities`),
      ]);

      const tData = await ticketRes.json();
      const cData = await commentsRes.json();
      const aData = await activitiesRes.json();

      if (ticketRes.ok) {
        setTicket(tData.ticket);
      } else {
        router.push('/tickets');
      }
      setComments(cData.comments || []);
      setActivities(aData.activities || []);
    } catch (err) {
      console.error('Error fetching ticket detailed data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketData();
  }, [id]);

  // Handle updates
  const handleUpdate = async (field: string, value: any) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        loadTicketData();
      }
    } catch (error) {
      console.error('Update fail:', error);
    }
  };

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentContent,
          isInternal: isInternalComment,
        }),
      });

      if (res.ok) {
        setCommentContent('');
        setIsInternalComment(false);
        loadTicketData();
      }
    } catch (error) {
      console.error('Comment submit fail:', error);
    }
  };

  // Generate AI comments summary
  const generateCommentsSummary = async () => {
    setAiSummaryLoading(true);
    setAiSummary(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          ticketId: id,
        }),
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Check for recurring incident via Copilot
  const checkRecurringIncident = async () => {
    if (!ticket) return;
    setAiRecurringChecked(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recurring',
          title: ticket.title,
          description: ticket.description,
          categoryId: ticket.categoryId,
        }),
      });
      const data = await res.json();
      setAiRecurringData(data);
    } catch (err) {
      console.error('Recurring scan error:', err);
    }
  };

  if (loading || !ticket) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading ticket #{id.slice(0, 8)} details...</p>
        </div>
      </AppLayout>
    );
  }

  const isEditable = session && ['ADMIN', 'MANAGER', 'AGENT'].includes(session.role);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link href="/tickets" className="p-2 border rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white truncate max-w-lg">
                {ticket.title}
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Ticket ID: #{ticket.id} • Created on {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateCommentsSummary}
              disabled={aiSummaryLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-600/5 hover:bg-purple-600/10 text-purple-600 dark:text-purple-400 text-xs font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {aiSummaryLoading ? 'Generating...' : 'AI Summary'}
            </button>
          </div>
        </div>

        {/* AI Summary Banner */}
        {aiSummary && (
          <div className="p-4 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/20 rounded-2xl animate-fade-in space-y-2">
            <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Automated Ticket & Comments Summary
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {aiSummary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Ticket content: Description, Comments thread */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-3 mb-4 dark:border-slate-800">
                <User className="w-4.5 h-4.5 text-purple-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Description
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto font-medium">
                  By {ticket.createdBy.firstName} {ticket.createdBy.lastName} ({ticket.createdBy.email})
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* AI Copilot Scan section */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
                <FolderSync className="w-4.5 h-4.5" />
                <span>AI Copilot Analysis</span>
              </div>

              {!aiRecurringChecked ? (
                <div className="flex items-center justify-between gap-4 p-3 bg-purple-500/5 dark:bg-purple-950/5 border border-purple-500/10 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Scan historical support ticket flows to see if this represents a recurring issue.
                  </p>
                  <button
                    onClick={checkRecurringIncident}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer whitespace-nowrap"
                  >
                    Scan Outbreaks
                  </button>
                </div>
              ) : !aiRecurringData ? (
                <div className="p-3 text-center text-xs text-gray-500 animate-pulse">
                  Comparing current ticket with similar issues in DB...
                </div>
              ) : (
                <div className="p-4 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/20 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Incident Scan Outcome:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      aiRecurringData.isRecurring ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {aiRecurringData.isRecurring ? 'Recurring incident' : 'Unique incident'}
                    </span>
                  </div>
                  {aiRecurringData.isRecurring && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Incident Group:</span> {aiRecurringData.incidentGroup}
                    </div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    {aiRecurringData.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Comments log thread */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b pb-3 mb-2 dark:border-slate-800">
                <MessageSquare className="w-4.5 h-4.5 text-purple-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Updates & Comments Log ({comments.length})
                </span>
              </div>

              {/* Feed */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No comments posted yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                        comment.isInternal
                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 font-medium">
                        <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {comment.user.firstName[0]}
                          {comment.user.lastName[0]}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {comment.user.firstName} {comment.user.lastName}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">
                          ({comment.user.roleId.toLowerCase()})
                        </span>
                        {comment.isInternal && (
                          <span className="ml-auto px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded">
                            INTERNAL NOTE
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="pl-8 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Submit Form */}
              {session && (
                <form onSubmit={handleSubmitComment} className="pt-4 border-t dark:border-slate-800 space-y-3">
                  <textarea
                    required
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Type an update or comment details..."
                    rows={3}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none resize-none"
                  />
                  <div className="flex items-center justify-between">
                    {/* Internal Checkbox for agents */}
                    {['ADMIN', 'MANAGER', 'AGENT'].includes(session.role) ? (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-amber-600 dark:text-amber-400">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="rounded border-amber-500/20 focus:ring-amber-500 focus:border-amber-500"
                        />
                        <span className="font-medium">Mark as Internal Note (Team Only)</span>
                      </label>
                    ) : (
                      <div />
                    )}

                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow cursor-pointer"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar Panel: Ticket details, SLA tracking, status changes */}
          <div className="space-y-6">
            {/* Status & Assignments controls */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b pb-2 dark:border-slate-800">
                Ticket Control Panel
              </h3>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Ticket Status
                </label>
                {isEditable ? (
                  <select
                    value={ticket.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                  >
                    {meta?.statuses.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold capitalize">{ticket.status.replace('_', ' ')}</span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Urgency Priority
                </label>
                {isEditable ? (
                  <select
                    value={ticket.priorityId}
                    onChange={(e) => handleUpdate('priorityId', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                  >
                    {meta?.priorities.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold">{ticket.priority.name}</span>
                )}
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Assigned Specialist
                </label>
                {session && ['ADMIN', 'MANAGER'].includes(session.role) ? (
                  <select
                    value={ticket.assignedToId || ''}
                    onChange={(e) => handleUpdate('assignedToId', e.target.value || null)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold">
                    {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                  </span>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Department
                </label>
                <span className="text-xs font-semibold">{ticket.department.name}</span>
              </div>
            </div>

            {/* SLA Status Card */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b pb-2 dark:border-slate-800 flex items-center justify-between">
                <span>SLA Audit Metrics</span>
                {ticket.slaResolutionBreached || ticket.slaResponseBreached ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded animate-pulse">
                    BREACHED
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-500 rounded">
                    COMPLIANT
                  </span>
                )}
              </h3>

              {/* Response SLA */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-gray-500">First Response SLA:</span>
                  <span className={ticket.slaResponseBreached ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {ticket.slaResponseBreached ? 'Breached' : 'Compliant'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Target Response: {new Date(ticket.slaResponseLimit).toLocaleString()}
                </div>
              </div>

              {/* Resolution SLA */}
              <div className="space-y-1 pt-2 border-t dark:border-slate-800/80">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-gray-500">Resolution SLA:</span>
                  <span className={ticket.slaResolutionBreached ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {ticket.slaResolutionBreached ? 'Breached' : 'Compliant'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Target Resolve: {new Date(ticket.slaResolutionLimit).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Audit Logs Activities Timeline */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b pb-2 dark:border-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-500" />
                Audit Trail Timeline
              </h3>

              <div className="relative border-l pl-4 dark:border-slate-800 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="relative text-[10px] leading-relaxed">
                    {/* Circle bullet on timeline */}
                    <div className="absolute left-[-21.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 border border-white dark:border-slate-900" />
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {act.action.replace('_', ' ')}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">{act.details}</p>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      {new Date(act.createdAt).toLocaleString()} 
                      {act.user && ` • By ${act.user.firstName}`}
                    </div>
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
