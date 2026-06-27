import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TicketStatus } from '@prisma/client';

export async function GET() {
  try {
    const [departments, categories, priorities] = await Promise.all([
      db.department.findMany({ orderBy: { name: 'asc' } }),
      db.category.findMany({ orderBy: { name: 'asc' } }),
      db.priority.findMany({ orderBy: { weight: 'asc' } }),
    ]);

    const statuses = Object.values(TicketStatus);

    return NextResponse.json({
      departments,
      categories,
      priorities,
      statuses,
    });
  } catch (error: any) {
    console.error('Meta API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
