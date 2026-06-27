import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TicketStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const agentId = searchParams.get('agentId');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const query = searchParams.get('q');

    const filter: any = {};

    if (status) filter.status = status as any;
    if (priority) filter.priorityId = priority;
    if (category) filter.categoryId = category;
    if (agentId) filter.assignedToId = agentId === 'unassigned' ? null : agentId;
    if (departmentId) filter.departmentId = departmentId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) filter.createdAt.lte = new Date(endDate);
    }

    // Search query
    if (query) {
      filter.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const tickets = await db.ticket.findMany({
      where: filter,
      include: {
        priority: true,
        category: true,
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, priorityId, categoryId, departmentId, dueDate, assignedToId } = await req.json();

    if (!title || !description || !priorityId || !categoryId || !departmentId) {
      return NextResponse.json(
        { error: 'Required fields: title, description, priorityId, categoryId, departmentId' },
        { status: 400 }
      );
    }

    const now = new Date();
    
    // SLA Limits (Response target: 4h, Resolution target: 24h)
    const slaResponseLimit = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const slaResolutionLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const ticket = await db.ticket.create({
      data: {
        title,
        description,
        status: TicketStatus.NEW,
        priorityId,
        categoryId,
        departmentId,
        createdById: userId,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        slaResponseLimit,
        slaResolutionLimit,
      },
      include: {
        priority: true,
        category: true,
        createdBy: true,
        assignedTo: true,
        department: true,
      },
    });

    // Create Audit Log Activity
    await db.activity.create({
      data: {
        ticketId: ticket.id,
        userId: userId,
        action: 'TICKET_CREATED',
        details: 'Ticket was submitted.',
      },
    });

    // If initial assignment is set, record it
    if (assignedToId) {
      await db.activity.create({
        data: {
          ticketId: ticket.id,
          userId: userId,
          action: 'ASSIGNED',
          details: `Ticket assigned to agent: ${ticket.assignedTo?.firstName} ${ticket.assignedTo?.lastName}`,
        },
      });

      // Send in-app notification to the assigned agent
      await db.notification.create({
        data: {
          userId: assignedToId,
          title: 'New Ticket Assigned',
          message: `Ticket #${ticket.id.slice(0, 8)} (${ticket.title}) has been assigned to you.`,
          type: 'ASSIGNED',
          ticketId: ticket.id,
        },
      });
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
