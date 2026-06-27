import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TicketStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id },
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
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Fetch ticket detail error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id') || undefined;

    const body = await req.json();
    const { title, description, status, priorityId, categoryId, departmentId, assignedToId, dueDate } = body;

    const currentTicket = await db.ticket.findUnique({
      where: { id },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updateData: any = {};
    const activitiesToCreate: { action: string; details: string }[] = [];

    // Title update
    if (title !== undefined && title !== currentTicket.title) {
      updateData.title = title;
      activitiesToCreate.push({
        action: 'TICKET_UPDATED',
        details: `Title updated to: ${title}`,
      });
    }

    // Description update
    if (description !== undefined && description !== currentTicket.description) {
      updateData.description = description;
      activitiesToCreate.push({
        action: 'TICKET_UPDATED',
        details: `Description updated.`,
      });
    }

    // Category update
    if (categoryId !== undefined && categoryId !== currentTicket.categoryId) {
      updateData.categoryId = categoryId;
      activitiesToCreate.push({
        action: 'TICKET_UPDATED',
        details: `Category changed to: ${categoryId}`,
      });
    }

    // Department update
    if (departmentId !== undefined && departmentId !== currentTicket.departmentId) {
      updateData.departmentId = departmentId;
      activitiesToCreate.push({
        action: 'TICKET_UPDATED',
        details: `Department changed to: ${departmentId}`,
      });
    }

    // Due Date update
    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
      if (newDueDate?.getTime() !== currentTicket.dueDate?.getTime()) {
        updateData.dueDate = newDueDate;
        activitiesToCreate.push({
          action: 'TICKET_UPDATED',
          details: `Due date updated to: ${dueDate || 'None'}`,
        });
      }
    }

    // Priority update
    if (priorityId !== undefined && priorityId !== currentTicket.priorityId) {
      updateData.priorityId = priorityId;
      activitiesToCreate.push({
        action: 'TICKET_UPDATED',
        details: `Priority changed to: ${priorityId}`,
      });
    }

    // Assignee update
    if (assignedToId !== undefined && assignedToId !== currentTicket.assignedToId) {
      updateData.assignedToId = assignedToId;
      if (assignedToId) {
        const agent = await db.user.findUnique({ where: { id: assignedToId } });
        activitiesToCreate.push({
          action: 'ASSIGNED',
          details: `Ticket assigned to agent: ${agent?.firstName} ${agent?.lastName}`,
        });

        // Send notification
        await db.notification.create({
          data: {
            userId: assignedToId,
            title: 'Ticket Assigned',
            message: `Ticket #${id.slice(0, 8)} has been assigned to you.`,
            type: 'ASSIGNED',
            ticketId: id,
          },
        });
      } else {
        activitiesToCreate.push({
          action: 'ASSIGNED',
          details: 'Ticket unassigned.',
        });
      }
    }

    // Status update & SLA Calculations
    if (status !== undefined && status !== currentTicket.status) {
      updateData.status = status;
      activitiesToCreate.push({
        action: 'STATUS_CHANGE',
        details: `Status changed from ${currentTicket.status.replace('_', ' ')} to ${status.replace('_', ' ')}`,
      });

      const now = new Date();

      // First response SLA calculation
      if (currentTicket.status === TicketStatus.NEW && status !== TicketStatus.NEW) {
        updateData.lastResponseAt = now;
        if (currentTicket.slaResponseLimit) {
          updateData.slaResponseBreached = now > currentTicket.slaResponseLimit;
        }
      }

      // Resolution SLA calculation
      if (status === TicketStatus.RESOLVED && currentTicket.status !== TicketStatus.RESOLVED) {
        updateData.resolvedAt = now;
        if (currentTicket.slaResolutionLimit) {
          updateData.slaResolutionBreached = now > currentTicket.slaResolutionLimit;
        }
      } else if (status !== TicketStatus.RESOLVED && currentTicket.status === TicketStatus.RESOLVED) {
        // Reopened ticket logic
        updateData.resolvedAt = null;
        activitiesToCreate.push({
          action: 'REOPENED',
          details: 'Ticket reopened.',
        });
      }

      // Closed ticket logic
      if (status === TicketStatus.CLOSED && currentTicket.status !== TicketStatus.CLOSED) {
        updateData.closedAt = now;
      } else if (status !== TicketStatus.CLOSED && currentTicket.status === TicketStatus.CLOSED) {
        updateData.closedAt = null;
      }
    }

    // Perform update in a transaction to guarantee consistency
    const updatedTicket = await db.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: {
          priority: true,
          category: true,
          createdBy: { select: { firstName: true, lastName: true, email: true } },
          assignedTo: { select: { firstName: true, lastName: true, email: true } },
          department: true,
        },
      });

      // Write activities
      for (const act of activitiesToCreate) {
        await tx.activity.create({
          data: {
            ticketId: id,
            userId,
            action: act.action,
            details: act.details,
          },
        });
      }

      return ticket;
    });

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error: any) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.ticket.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error: any) {
    console.error('Delete ticket error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
