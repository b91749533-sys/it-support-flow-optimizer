import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TicketStatus } from '@prisma/client';

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Fetch tickets and categories for calculations
    const [tickets, categories, priorities, agents] = await Promise.all([
      db.ticket.findMany({
        include: { priority: true, category: true, assignedTo: true },
      }),
      db.category.findMany(),
      db.priority.findMany({ orderBy: { weight: 'asc' } }),
      db.user.findMany({ where: { roleId: 'AGENT' } }),
    ]);

    const totalTickets = tickets.length;

    // 2. Metrics calculation
    const openTickets = tickets.filter((t) => 
      t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
    ).length;

    const resolvedToday = tickets.filter((t) => 
      t.resolvedAt && new Date(t.resolvedAt) >= startOfToday
    ).length;

    // SLA Compliant Tickets count
    const slaBreaches = tickets.filter((t) => t.slaResolutionBreached || t.slaResponseBreached).length;
    const slaCompliance = totalTickets > 0 ? Math.round(((totalTickets - slaBreaches) / totalTickets) * 100) : 100;

    // Average Response Time
    let totalResponseMs = 0;
    let responseCount = 0;
    tickets.forEach((t) => {
      if (t.lastResponseAt) {
        responseCount++;
        totalResponseMs += t.lastResponseAt.getTime() - t.createdAt.getTime();
      }
    });
    const avgResponseHours = responseCount > 0 ? Math.round((totalResponseMs / (1000 * 60 * 60)) * 10) / 10 : 0;

    // Average Resolution Time
    let totalResolutionMs = 0;
    let resolutionCount = 0;
    tickets.forEach((t) => {
      if (t.resolvedAt) {
        resolutionCount++;
        totalResolutionMs += t.resolvedAt.getTime() - t.createdAt.getTime();
      }
    });
    const avgResolutionHours = resolutionCount > 0 ? Math.round((totalResolutionMs / (1000 * 60 * 60)) * 10) / 10 : 0;

    // Escalation Rate
    const escalatedTickets = tickets.filter((t) => t.status === TicketStatus.ESCALATED).length;
    const escalationRate = totalTickets > 0 ? Math.round((escalatedTickets / totalTickets) * 100) : 0;

    // Reopened tickets count
    const reopenedCount = await db.activity.count({
      where: { action: 'REOPENED' },
    });

    // 3. Tickets by Category
    const byCategory = categories.map((cat) => {
      const count = tickets.filter((t) => t.categoryId === cat.id).length;
      return {
        id: cat.id,
        name: cat.name,
        count,
      };
    });

    // 4. Tickets by Priority
    const byPriority = priorities.map((prio) => {
      const count = tickets.filter((t) => t.priorityId === prio.id).length;
      return {
        id: prio.id,
        name: prio.name,
        count,
        color: prio.color,
      };
    });

    // 5. Workload Distribution by Agent
    const byAgent = agents.map((agent) => {
      const count = tickets.filter((t) => 
        t.assignedToId === agent.id &&
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED
      ).length;
      return {
        name: `${agent.firstName} ${agent.lastName}`,
        openTickets: count,
      };
    });

    // 6. SLA breaches count
    const totalSlaBreaches = slaBreaches;

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        resolvedToday,
        avgResponseHours,
        avgResolutionHours,
        slaCompliance,
        escalationRate,
        reopenedCount,
        totalSlaBreaches,
      },
      charts: {
        byCategory,
        byPriority,
        byAgent,
      },
    });
  } catch (error: any) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
