import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await db.comment.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, roleId: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, isInternal } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Standard users (AGENT if not elevated) can only post internal comments if they have permission
    // But let's check: only ADMIN or MANAGER or AGENT roles should create internal comments.
    // If a standard customer role exists, we can prevent internal comments. But in this schema,
    // agents and admins can create internal comments.
    const isInternalFinal = isInternal && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole || '');

    const comment = await db.comment.create({
      data: {
        ticketId: id,
        userId,
        content,
        isInternal: isInternalFinal,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, roleId: true },
        },
      },
    });

    // Record activity log
    await db.activity.create({
      data: {
        ticketId: id,
        userId,
        action: 'COMMENT_ADDED',
        details: `${isInternalFinal ? 'Internal comment' : 'Public comment'} added by ${comment.user.firstName} ${comment.user.lastName}.`,
      },
    });

    return NextResponse.json({ comment });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
