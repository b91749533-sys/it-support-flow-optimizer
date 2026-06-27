import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';
import { TicketStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'monthly'; // monthly, agent, sla, department
    const format = searchParams.get('format') || 'csv';  // csv, excel, pdf

    // 1. GATHER DATA
    let data: any[] = [];
    let sheetName = 'Report';

    if (type === 'agent') {
      sheetName = 'Agent Performance';
      const agents = await db.user.findMany({
        where: { roleId: 'AGENT' },
        include: {
          assignedTickets: {
            include: { priority: true, category: true },
          },
          department: true,
        },
      });

      data = agents.map((agent) => {
        const total = agent.assignedTickets.length;
        const open = agent.assignedTickets.filter((t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length;
        const resolved = agent.assignedTickets.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
        const breaches = agent.assignedTickets.filter((t) => t.slaResolutionBreached || t.slaResponseBreached).length;

        let totalResolutionHours = 0;
        let resolvedCount = 0;
        agent.assignedTickets.forEach((t) => {
          if (t.resolvedAt) {
            resolvedCount++;
            totalResolutionHours += (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
          }
        });

        const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionHours / resolvedCount) : 0;
        const slaCompliance = total > 0 ? Math.round(((total - breaches) / total) * 100) : 100;

        return {
          'Agent Email': agent.email,
          'Agent Name': `${agent.firstName} ${agent.lastName}`,
          'Department': agent.department?.name || 'Unassigned',
          'Total Tickets': total,
          'Open Tickets': open,
          'Resolved Tickets': resolved,
          'SLA Violations': breaches,
          'SLA Compliance Rate (%)': slaCompliance,
          'Avg Resolution (Hours)': avgResolutionTime,
        };
      });
    } 
    
    else if (type === 'sla') {
      sheetName = 'SLA Audit Log';
      const tickets = await db.ticket.findMany({
        include: {
          priority: true,
          category: true,
          assignedTo: true,
          department: true,
        },
      });

      data = tickets.map((t) => {
        const responseSla = t.slaResponseBreached ? 'Breached' : t.lastResponseAt ? 'Compliant' : 'Pending';
        const resolutionSla = t.slaResolutionBreached ? 'Breached' : t.resolvedAt ? 'Compliant' : 'Pending';

        return {
          'Ticket ID': t.id.slice(0, 8),
          'Title': t.title,
          'Category': t.categoryId,
          'Priority': t.priorityId,
          'Department': t.department?.name || 'None',
          'Assigned Agent': t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned',
          'Created Date': t.createdAt.toLocaleDateString(),
          'Response SLA': responseSla,
          'Resolution SLA': resolutionSla,
        };
      });
    }

    else if (type === 'department') {
      sheetName = 'Department Performance';
      const departments = await db.department.findMany({
        include: {
          tickets: {
            include: { priority: true },
          },
        },
      });

      data = departments.map((dept) => {
        const total = dept.tickets.length;
        const open = dept.tickets.filter((t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length;
        const resolved = dept.tickets.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
        const breaches = dept.tickets.filter((t) => t.slaResolutionBreached).length;
        const slaCompliance = total > 0 ? Math.round(((total - breaches) / total) * 100) : 100;

        return {
          'Department': dept.name,
          'Total Tickets': total,
          'Open Tickets': open,
          'Resolved Tickets': resolved,
          'SLA Violations': breaches,
          'SLA Compliance Rate (%)': slaCompliance,
        };
      });
    }

    else { // default: monthly
      sheetName = 'Monthly Performance';
      const tickets = await db.ticket.findMany({
        include: { category: true, priority: true },
      });

      // Group by month
      const groups: { [key: string]: any } = {};
      tickets.forEach((t) => {
        const month = t.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groups[month]) {
          groups[month] = { total: 0, resolved: 0, open: 0, breaches: 0 };
        }
        groups[month].total++;
        if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
          groups[month].resolved++;
        } else {
          groups[month].open++;
        }
        if (t.slaResolutionBreached) {
          groups[month].breaches++;
        }
      });

      data = Object.keys(groups).map((month) => {
        const total = groups[month].total;
        const breaches = groups[month].breaches;
        const slaCompliance = total > 0 ? Math.round(((total - breaches) / total) * 100) : 100;

        return {
          'Month': month,
          'Total Tickets Created': total,
          'Open Tickets': groups[month].open,
          'Resolved Tickets': groups[month].resolved,
          'SLA Violations': breaches,
          'SLA Compliance Rate (%)': slaCompliance,
        };
      });
    }

    // 2. EXPORT AS FORMAT
    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((fieldName) => {
              const val = row[fieldName];
              const escaped = ('' + (val ?? '')).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="${sheetName.toLowerCase().replace(/ /g, '_')}_report.csv"`,
        },
      });
    } 
    
    else if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${sheetName.toLowerCase().replace(/ /g, '_')}_report.xlsx"`,
        },
      });
    } 
    
    else { // format: pdf (mock text/PDF report structure)
      const title = `=== IT SUPPORT FLOW OPTIMIZER REPORT: ${sheetName.toUpperCase()} ===`;
      const date = `Generated on: ${new Date().toLocaleString()}`;
      const branding = `Made by Youssef Manssouri`;
      const line = '='.repeat(title.length);

      const headers = Object.keys(data[0] || {});
      const tableRows = data.map((row) =>
        headers.map((fieldName) => `${fieldName}: ${row[fieldName]}`).join(' | ')
      );

      const pdfContent = [
        line,
        title,
        date,
        branding,
        line,
        '',
        ...tableRows,
        '',
        line,
        'End of Report',
      ].join('\n');

      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf', // using pdf mime but returning clean text presentation layout for ease of generation
          'Content-Disposition': `attachment; filename="${sheetName.toLowerCase().replace(/ /g, '_')}_report.pdf"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Export report error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
