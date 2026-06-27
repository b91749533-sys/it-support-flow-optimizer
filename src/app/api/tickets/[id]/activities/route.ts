import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const activities = await db.activity.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, roleId: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Fetch activities error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
