import { PrismaClient, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // 1. Roles
  const roles = [
    { id: 'ADMIN', name: 'Administrator', description: 'System administrator with full access' },
    { id: 'MANAGER', name: 'Manager', description: 'IT Support team leader / manager' },
    { id: 'AGENT', name: 'Support Agent', description: 'IT Support agent resolving tickets' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }
  console.log('Roles seeded.');

  // 2. Departments
  const departments = [
    { name: 'IT Infrastructure', description: 'Network, servers, and hardware systems' },
    { name: 'Human Resources', description: 'Employee lifecycle, benefits, and workplace' },
    { name: 'Finance & Accounts', description: 'Payroll, invoicing, and audits' },
    { name: 'Engineering', description: 'Software development and QA' },
    { name: 'Customer Success', description: 'Client operations and accounts' },
  ];

  const dbDepts = [];
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
    dbDepts.push(d);
  }
  console.log('Departments seeded.');

  // 3. Categories
  const categories = [
    { id: 'hardware', name: 'Hardware', description: 'Laptops, monitors, printers, and peripherals' },
    { id: 'software', name: 'Software', description: 'OS installation, software licenses, and application errors' },
    { id: 'network', name: 'Network', description: 'Wi-Fi, VPN, firewall, and internet connectivity issues' },
    { id: 'access_management', name: 'Access Management', description: 'Password resets, account creation, and role permissions' },
    { id: 'security', name: 'Security', description: 'Phishing alerts, virus scans, and security policy issues' },
    { id: 'other', name: 'Other', description: 'General support requests' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  console.log('Categories seeded.');

  // 4. Priorities
  const priorities = [
    { id: 'low', name: 'Low', weight: 1, color: '#3b82f6' },
    { id: 'medium', name: 'Medium', weight: 2, color: '#eab308' },
    { id: 'high', name: 'High', weight: 3, color: '#f97316' },
    { id: 'critical', name: 'Critical', weight: 4, color: '#ef4444' },
  ];

  for (const prio of priorities) {
    await prisma.priority.upsert({
      where: { id: prio.id },
      update: {},
      create: prio,
    });
  }
  console.log('Priorities seeded.');

  // 5. Users
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const agentPasswordHash = await bcrypt.hash('Agent123!', 10);
  const userPasswordHash = await bcrypt.hash('User123!', 10);

  // Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@itsupport.com' },
    update: {},
    create: {
      email: 'admin@itsupport.com',
      passwordHash,
      firstName: 'Youssef',
      lastName: 'Manssouri',
      roleId: 'ADMIN',
      departmentId: dbDepts[0].id, // IT
    },
  });

  // Managers
  const managers = [
    { email: 'sarah.connor@itsupport.com', firstName: 'Sarah', lastName: 'Connor', roleId: 'MANAGER', departmentId: dbDepts[0].id },
    { email: 'john.smith@itsupport.com', firstName: 'John', lastName: 'Smith', roleId: 'MANAGER', departmentId: dbDepts[1].id },
  ];

  const dbManagers = [];
  for (const mgr of managers) {
    const m = await prisma.user.upsert({
      where: { email: mgr.email },
      update: {},
      create: {
        ...mgr,
        passwordHash,
      },
    });
    dbManagers.push(m);
  }

  // Agents
  const agents = [
    { email: 'agent.david@itsupport.com', firstName: 'David', lastName: 'Miller', roleId: 'AGENT', departmentId: dbDepts[0].id },
    { email: 'agent.emily@itsupport.com', firstName: 'Emily', lastName: 'Watson', roleId: 'AGENT', departmentId: dbDepts[0].id },
    { email: 'agent.robert@itsupport.com', firstName: 'Robert', lastName: 'Downey', roleId: 'AGENT', departmentId: dbDepts[0].id },
    { email: 'agent.jane@itsupport.com', firstName: 'Jane', lastName: 'Doe', roleId: 'AGENT', departmentId: dbDepts[0].id },
  ];

  const dbAgents = [];
  for (const ag of agents) {
    const a = await prisma.user.upsert({
      where: { email: ag.email },
      update: {},
      create: {
        ...ag,
        passwordHash: agentPasswordHash,
      },
    });
    dbAgents.push(a);
  }

  // Customers / Standard Users
  const usersList = [
    { email: 'alice@company.com', firstName: 'Alice', lastName: 'Green', roleId: 'AGENT', departmentId: dbDepts[1].id }, // HR employee
    { email: 'bob@company.com', firstName: 'Bob', lastName: 'Builder', roleId: 'AGENT', departmentId: dbDepts[3].id }, // Engineering employee
    { email: 'clara@company.com', firstName: 'Clara', lastName: 'Oswald', roleId: 'AGENT', departmentId: dbDepts[2].id }, // Finance employee
    { email: 'dan@company.com', firstName: 'Dan', lastName: 'Carter', roleId: 'AGENT', departmentId: dbDepts[4].id }, // CS employee
  ];

  const dbUsers = [];
  for (const usr of usersList) {
    const u = await prisma.user.upsert({
      where: { email: usr.email },
      update: {},
      create: {
        ...usr,
        roleId: 'AGENT', // In this schema, standard users can be created as agents or we just classify them. Let's make sure they are in the database. Wait, let's make their role AGENT/MANAGER but we can treat them as creators. Or wait, let's register standard users as AGENTs but let's change their emails. Let's make standard users.
        passwordHash: userPasswordHash,
      },
    });
    dbUsers.push(u);
  }

  console.log('Users seeded.');

  // 6. Tickets (Seeding historical data for nice dashboard analytics)
  console.log('Seeding tickets...');
  const ticketTemplates = [
    { title: 'VPN connection dropping repeatedly', desc: 'My VPN drops connection every 5-10 minutes. Cannot work remotely.', cat: 'network', prio: 'high', status: TicketStatus.RESOLVED },
    { title: 'New laptop setup requested', desc: 'Need a new developer laptop set up for the upcoming software engineer hire.', cat: 'hardware', prio: 'medium', status: TicketStatus.CLOSED },
    { title: 'Cannot access payroll portal', desc: 'Locked out of the payroll portal after 3 wrong password attempts.', cat: 'access_management', prio: 'medium', status: TicketStatus.RESOLVED },
    { title: 'Suspicious email received', desc: 'I received an email claiming to be from the CEO asking for gift cards. Phishing?', cat: 'security', prio: 'critical', status: TicketStatus.RESOLVED },
    { title: 'Photoshop license expired', desc: 'My Adobe Photoshop says the license expired yesterday. Need renewal.', cat: 'software', prio: 'low', status: TicketStatus.CLOSED },
    { title: 'Wi-Fi slow in Meeting Room B', desc: 'Internet drops to less than 1Mbps when multiple people connect.', cat: 'network', prio: 'medium', status: TicketStatus.OPEN },
    { title: 'Printer jam on Floor 3', desc: 'Paper jammed in the tray and the screen shows error code 501.', cat: 'hardware', prio: 'low', status: TicketStatus.NEW },
    { title: 'Request access to Git Repository X', desc: 'Need access to repo X to check backend implementation.', cat: 'access_management', prio: 'low', status: TicketStatus.IN_PROGRESS },
    { title: 'Antivirus scan flag', desc: 'My laptop showed a popup saying virus threats were detected and quarantined.', cat: 'security', prio: 'high', status: TicketStatus.IN_PROGRESS },
    { title: 'Excel crashing on startup', desc: 'Every time I open Microsoft Excel, it shows a blank white screen and crashes.', cat: 'software', prio: 'medium', status: TicketStatus.WAITING_FOR_USER },
    { title: 'Database server high memory alert', desc: 'Production DB server memory is at 96% utilization. Imminent risk.', cat: 'network', prio: 'critical', status: TicketStatus.ESCALATED },
    { title: 'Monitor screen flickering', desc: 'External monitor flickers constantly. Replaced HDMI cable, issue persists.', cat: 'hardware', prio: 'low', status: TicketStatus.NEW },
    { title: 'Reset Jira password', desc: 'Need a password reset link for Jira.', cat: 'access_management', prio: 'low', status: TicketStatus.RESOLVED },
    { title: 'SSO configuration for new app', desc: 'Integrate Okta SSO for our internal planning tool.', cat: 'access_management', prio: 'high', status: TicketStatus.RESOLVED },
    { title: 'Spam call routing issue', desc: 'Corporate phones receiving hundreds of spam calls daily.', cat: 'network', prio: 'medium', status: TicketStatus.RESOLVED },
  ];

  // We will distribute the tickets over the last 30 days
  const now = new Date();
  for (let i = 0; i < 45; i++) {
    // Generate a random ticket template
    const template = ticketTemplates[i % ticketTemplates.length];
    
    // Choose a random creator and assignee
    const creator = dbUsers[i % dbUsers.length];
    const assignee = i % 5 === 0 ? null : dbAgents[i % dbAgents.length]; // 20% tickets unassigned
    const dept = dbDepts[i % dbDepts.length];

    // Determine creation date spread over the last 30 days
    const createdDaysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000 - Math.random() * 12 * 60 * 60 * 1000);
    
    // Determine resolution date
    let resolvedAt: Date | null = null;
    let closedAt: Date | null = null;
    let status = template.status;

    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
      const resolutionHours = Math.floor(Math.random() * 48) + 1; // 1 to 49 hours to resolve
      resolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
      if (status === TicketStatus.CLOSED) {
        closedAt = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000); // Closed 24 hours later
      }
    }

    // Determine SLA Limits
    // SLA response limit is 4 hours, SLA resolution limit is 24 hours
    const slaResponseLimit = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
    const slaResolutionLimit = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    // Calculate response & resolution times to decide breaches
    let lastResponseAt: Date | null = null;
    let slaResponseBreached = false;
    let slaResolutionBreached = false;

    if (status !== TicketStatus.NEW) {
      // First response was within 1 to 5 hours
      const responseMinutes = Math.floor(Math.random() * 300) + 10;
      lastResponseAt = new Date(createdAt.getTime() + responseMinutes * 60 * 1000);
      slaResponseBreached = lastResponseAt > slaResponseLimit;
    }

    if (resolvedAt) {
      slaResolutionBreached = resolvedAt > slaResolutionLimit;
    } else {
      // If still open and past the limit, it breached
      slaResolutionBreached = now > slaResolutionLimit;
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: `${template.title} #${i + 1001}`,
        description: template.desc,
        status,
        priorityId: template.prio,
        categoryId: template.cat,
        createdById: creator.id,
        assignedToId: assignee?.id || null,
        departmentId: dept.id,
        createdAt,
        updatedAt: resolvedAt || createdAt,
        resolvedAt,
        closedAt,
        lastResponseAt,
        slaResponseLimit,
        slaResolutionLimit,
        slaResponseBreached,
        slaResolutionBreached,
      },
    });

    // Create Audit Logs (Activities)
    await prisma.activity.create({
      data: {
        ticketId: ticket.id,
        userId: creator.id,
        action: 'TICKET_CREATED',
        details: 'Ticket was created by customer.',
        createdAt,
      },
    });

    if (assignee) {
      await prisma.activity.create({
        data: {
          ticketId: ticket.id,
          userId: admin.id,
          action: 'ASSIGNED',
          details: `Ticket assigned to agent: ${assignee.firstName} ${assignee.lastName}`,
          createdAt: new Date(createdAt.getTime() + 15 * 60 * 1000), // 15 mins later
        },
      });
    }

    if (status !== TicketStatus.NEW && status !== TicketStatus.OPEN && assignee) {
      await prisma.activity.create({
        data: {
          ticketId: ticket.id,
          userId: assignee.id,
          action: 'STATUS_CHANGE',
          details: `Status changed to ${status.replace('_', ' ')}`,
          createdAt: lastResponseAt || new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    }

    // Add comments
    if (i % 2 === 0) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          userId: creator.id,
          content: 'Is there any update on this issue? I cannot complete my work.',
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });

      if (assignee) {
        await prisma.comment.create({
          data: {
            ticketId: ticket.id,
            userId: assignee.id,
            content: 'Investigating the logs right now. Will post an update shortly.',
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 2.5 * 60 * 60 * 1000),
          },
        });
      }
    }

    // SLA breach notification
    if (slaResolutionBreached) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'SLA Breach Alert',
          message: `Ticket #${ticket.id.slice(0, 8)} (${ticket.title}) has violated resolution SLA limit.`,
          type: 'SLA_BREACH',
          ticketId: ticket.id,
          createdAt: slaResolutionLimit,
        },
      });
    }
  }

  console.log('Tickets seeded.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
