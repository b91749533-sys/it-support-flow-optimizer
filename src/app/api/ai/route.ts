import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateSummary,
  predictResolutionTime,
  recommendAssignment,
  identifyRecurringIncidents,
  detectBottlenecks,
} from '@/lib/gemini';
import { TicketStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId, title, description, categoryId, priorityId } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // ACTION 1: SUMMARIZE TICKET COMMENTS
    if (action === 'summarize') {
      if (!ticketId) {
        return NextResponse.json({ error: 'ticketId is required for summarizing' }, { status: 400 });
      }

      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        include: {
          comments: {
            include: { user: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const commentsFormatted = ticket.comments.map((c) => ({
        user: `${c.user.firstName} ${c.user.lastName}`,
        content: c.content,
        createdAt: c.createdAt,
      }));

      const summary = await generateSummary(ticket.title, ticket.description, commentsFormatted);
      return NextResponse.json({ summary });
    }

    // ACTION 2: PREDICT RESOLUTION TIME
    if (action === 'predict-resolution') {
      if (!title || !description || !categoryId || !priorityId) {
        return NextResponse.json({ error: 'Required fields: title, description, categoryId, priorityId' }, { status: 400 });
      }

      // Gather active agent workload metrics
      const agents = await db.user.findMany({
        where: { roleId: 'AGENT' },
        include: {
          assignedTickets: {
            where: { status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
          },
        },
      });

      const agentWorkload = agents.map((a) => ({
        name: `${a.firstName} ${a.lastName}`,
        openTicketsCount: a.assignedTickets.length,
      }));

      const prediction = await predictResolutionTime(
        title,
        description,
        categoryId,
        priorityId,
        agentWorkload
      );

      return NextResponse.json(prediction);
    }

    // ACTION 3: RECOMMEND AGENT ASSIGNMENT
    if (action === 'recommend-agent') {
      if (!title || !description || !categoryId) {
        return NextResponse.json({ error: 'Required fields: title, description, categoryId' }, { status: 400 });
      }

      // Gather active agents list with workloads
      const agents = await db.user.findMany({
        where: { roleId: 'AGENT' },
        include: {
          assignedTickets: {
            where: { status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
          },
        },
      });

      const agentsFormatted = agents.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        workload: a.assignedTickets.length,
        categoryFocus: [a.departmentId || 'general'], // using departmentId as active specialty fallback
      }));

      const recommendation = await recommendAssignment(
        title,
        description,
        categoryId,
        agentsFormatted
      );

      return NextResponse.json(recommendation);
    }

    // ACTION 4: IDENTIFY RECURRING INCIDENTS
    if (action === 'recurring') {
      if (!title || !description || !categoryId) {
        return NextResponse.json({ error: 'Required fields: title, description, categoryId' }, { status: 400 });
      }

      // Fetch 10 most recent tickets
      const recentTickets = await db.ticket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, categoryId: true, createdAt: true },
      });

      const recentFormatted = recentTickets.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.categoryId,
        createdAt: t.createdAt,
      }));

      const recurringData = await identifyRecurringIncidents(
        title,
        description,
        categoryId,
        recentFormatted
      );

      return NextResponse.json(recurringData);
    }

    // ACTION 5: DETECT BOTTLENECKS
    if (action === 'bottlenecks') {
      const categories = await db.category.findMany({
        include: {
          tickets: {
            select: { status: true, resolvedAt: true, createdAt: true, slaResolutionBreached: true },
          },
        },
      });

      const ticketMetrics = categories.map((c) => {
        const openTickets = c.tickets.filter((t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED);
        const resolvedTickets = c.tickets.filter((t) => t.resolvedAt !== null);

        let totalHours = 0;
        resolvedTickets.forEach((t) => {
          if (t.resolvedAt) {
            totalHours += (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
          }
        });

        const avgResolutionHours = resolvedTickets.length > 0 ? Math.round(totalHours / resolvedTickets.length) : 0;
        const slaBreaches = c.tickets.filter((t) => t.slaResolutionBreached).length;

        return {
          category: c.name,
          openCount: openTickets.length,
          avgResolutionHours,
          slaBreaches,
        };
      });

      const agents = await db.user.findMany({
        where: { roleId: 'AGENT' },
        include: {
          assignedTickets: {
            where: { status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
          },
        },
      });

      const agentMetrics = agents.map((a) => ({
        name: `${a.firstName} ${a.lastName}`,
        openCount: a.assignedTickets.length,
      }));

      const bottleneckReport = await detectBottlenecks(ticketMetrics, agentMetrics);
      return NextResponse.json(bottleneckReport);
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
