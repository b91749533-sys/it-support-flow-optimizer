import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

// Gracefully initialize Gemini. If it fails or is absent, we fallback to heuristics.
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error('Failed to initialize GoogleGenAI client:', e);
  }
}

// 1. Generate automated summaries
export async function generateSummary(
  title: string,
  description: string,
  comments: { user: string; content: string; createdAt: Date }[]
): Promise<string> {
  const commentsStr = comments
    .map((c) => `[${c.user} at ${new Date(c.createdAt).toLocaleDateString()}]: ${c.content}`)
    .join('\n');

  const prompt = `
Summarize the following IT support ticket and its comments into a single, concise paragraph. Focus on the core problem, what steps have been taken, and the current status. Do not exceed 4 lines.

Ticket Title: ${title}
Ticket Description: ${description}

Comments Log:
${commentsStr || 'No comments yet.'}
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text?.trim() || 'No summary could be generated.';
    } catch (e) {
      console.error('Gemini error summarizing ticket:', e);
    }
  }

  // Heuristic Fallback
  return `[Auto-Heuristic Summary] The ticket "${title}" describes: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}". It currently has ${comments.length} updates.`;
}

// 2. Predict Resolution Time
export async function predictResolutionTime(
  title: string,
  description: string,
  category: string,
  priority: string,
  agentWorkload: { name: string; openTicketsCount: number }[]
): Promise<{ hours: number; confidence: string; reasoning: string }> {
  const workloadStr = agentWorkload.map((w) => `${w.name} has ${w.openTicketsCount} open tickets`).join(', ');

  const prompt = `
Analyze the following IT support ticket attributes and predict the estimated time to resolution (in hours).
Also return a confidence level (High, Medium, Low) and a brief reasoning string.

Ticket Title: ${title}
Ticket Description: ${description}
Category: ${category}
Priority: ${priority}
Current Agent Workloads: ${workloadStr}

Return JSON matching this schema:
{
  "hours": number,
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "string"
}
Do not return any markdown markdown wrapper, just raw JSON.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (e) {
      console.error('Gemini error predicting resolution time:', e);
    }
  }

  // Heuristic Fallback
  let baseHours = 24;
  if (priority.toLowerCase() === 'critical') baseHours = 4;
  else if (priority.toLowerCase() === 'high') baseHours = 12;
  else if (priority.toLowerCase() === 'low') baseHours = 72;

  if (category.toLowerCase() === 'security') baseHours = Math.max(2, baseHours * 0.5);

  return {
    hours: baseHours,
    confidence: 'Medium (Heuristic)',
    reasoning: `Calculated base resolution time for ${priority} priority in the ${category} category, assuming standard queue workloads.`,
  };
}

// 3. Recommend Ticket Assignment
export async function recommendAssignment(
  title: string,
  description: string,
  category: string,
  agents: { id: string; name: string; workload: number; categoryFocus: string[] }[]
): Promise<{ agentId: string; agentName: string; reasoning: string }> {
  if (agents.length === 0) {
    return { agentId: '', agentName: 'None', reasoning: 'No active support agents available.' };
  }

  const agentsStr = agents
    .map((a) => `Agent ID: ${a.id}, Name: ${a.name}, Open Tickets Queue: ${a.workload}, Specialties: ${a.categoryFocus.join(', ')}`)
    .join('\n');

  const prompt = `
Recommend the best IT support agent to assign to the following ticket. Prefer agents who specialize in this ticket's category (or title keywords) and have lower active workloads.

Ticket Title: ${title}
Ticket Description: ${description}
Category: ${category}

Available Agents:
${agentsStr}

Return JSON matching this schema:
{
  "agentId": "string",
  "agentName": "string",
  "reasoning": "string"
}
Do not return any markdown wrapper, just raw JSON.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (e) {
      console.error('Gemini error recommending agent:', e);
    }
  }

  // Heuristic Fallback: Select agent with minimum workload
  const sorted = [...agents].sort((a, b) => a.workload - b.workload);
  const bestAgent = sorted[0];

  return {
    agentId: bestAgent.id,
    agentName: bestAgent.name,
    reasoning: `Selected agent ${bestAgent.name} because they currently have the lightest active queue (${bestAgent.workload} open tickets).`,
  };
}

// 4. Identify Recurring Incidents
export async function identifyRecurringIncidents(
  title: string,
  description: string,
  category: string,
  recentTickets: { id: string; title: string; category: string; createdAt: Date }[]
): Promise<{ isRecurring: boolean; incidentGroup?: string; confidence: string; reasoning: string }> {
  if (recentTickets.length === 0) {
    return { isRecurring: false, confidence: 'High', reasoning: 'No historical incidents found to compare against.' };
  }

  const recentStr = recentTickets
    .map((t) => `ID: ${t.id}, Title: ${t.title}, Category: ${t.category}`)
    .join('\n');

  const prompt = `
Analyze the new IT support ticket against the list of recently submitted tickets to identify if it is a recurring incident (part of a broader outbreak or common issue).

New Ticket Title: ${title}
New Ticket Description: ${description}
New Ticket Category: ${category}

Recent Tickets List:
${recentStr}

Return JSON matching this schema:
{
  "isRecurring": boolean,
  "incidentGroup": "string (name of the recurring issue pattern, or empty if not recurring)",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "string"
}
Do not return any markdown wrapper, just raw JSON.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (e) {
      console.error('Gemini error identifying recurring incident:', e);
    }
  }

  // Heuristic Fallback: Check if there's a title similarity matching keywords
  const titleKeywords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let matchingTicket = null;

  for (const t of recentTickets) {
    const tTitle = t.title.toLowerCase();
    const matchesCount = titleKeywords.filter((kw) => tTitle.includes(kw)).length;
    if (matchesCount >= 2) {
      matchingTicket = t;
      break;
    }
  }

  if (matchingTicket) {
    return {
      isRecurring: true,
      incidentGroup: `${matchingTicket.title.split('#')[0].trim()} Outbreak`,
      confidence: 'Medium (Heuristic)',
      reasoning: `Found a match with recent ticket "${matchingTicket.title}" sharing common keywords.`,
    };
  }

  return {
    isRecurring: false,
    confidence: 'Low (Heuristic)',
    reasoning: 'No close keyword matches found in recently created support tickets.',
  };
}

// 5. Detect Support Bottlenecks
export async function detectBottlenecks(
  ticketMetrics: { category: string; openCount: number; avgResolutionHours: number; slaBreaches: number }[],
  agentMetrics: { name: string; openCount: number }[]
): Promise<{ bottlenecks: string[]; recommendations: string[] }> {
  const metricsStr = ticketMetrics
    .map((m) => `Category: ${m.category}, Open Queue: ${m.openCount}, Avg Resolution: ${m.avgResolutionHours}h, SLA Breaches: ${m.slaBreaches}`)
    .join('\n');
  const agentsStr = agentMetrics.map((a) => `${a.name} has ${a.openCount} open tickets`).join('\n');

  const prompt = `
Analyze the following IT support metrics to identify performance bottlenecks and suggest actionable recommendations for IT managers.

Ticket Category Metrics:
${metricsStr}

Agent Queue Metrics:
${agentsStr}

Return JSON matching this schema:
{
  "bottlenecks": ["string"],
  "recommendations": ["string"]
}
Do not return any markdown wrapper, just raw JSON.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (e) {
      console.error('Gemini error detecting bottlenecks:', e);
    }
  }

  // Heuristic Fallback
  const bottlenecks = [];
  const recommendations = [];

  // Look for category with most open tickets or high SLA breaches
  const worstCategory = [...ticketMetrics].sort((a, b) => b.openCount - a.openCount)[0];
  if (worstCategory && worstCategory.openCount > 5) {
    bottlenecks.push(`High workload bottleneck detected in the "${worstCategory.category}" category, which has ${worstCategory.openCount} open tickets.`);
    recommendations.push(`Assign more support agents to specialize in and address the "${worstCategory.category}" queue.`);
  }

  // Look for overloaded agent
  const busyAgent = [...agentMetrics].sort((a, b) => b.openCount - a.openCount)[0];
  if (busyAgent && busyAgent.openCount > 5) {
    bottlenecks.push(`Agent workload bottleneck: ${busyAgent.name} has an overloaded queue of ${busyAgent.openCount} open tickets.`);
    recommendations.push(`Redistribute incoming tickets away from ${busyAgent.name} to agents with lighter workloads.`);
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push('No severe bottlenecks detected. Support queues are healthy.');
    recommendations.push('Maintain current agent distribution and monitor workloads weekly.');
  }

  return { bottlenecks, recommendations };
}
