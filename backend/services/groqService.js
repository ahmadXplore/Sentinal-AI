/**
 * Groq AI service — Replaces local Ollama with lightning-fast Groq API.
 */
const config = require('../config/env');
const metrics = require('./aiMetrics');
const { buildLogAnalysisContext } = require('./AIContextBuilder');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = config.groqModel;

// ── Tuned defaults ─────────────────────────────────────────────
const CHAT_OPTS = {
  num_predict: 512,
  temperature: 0.3,
  top_p: 0.85,
};

const REPORT_OPTS = {
  num_predict: 512,
  temperature: 0.4,
  top_p: 0.85,
};

const ANALYSIS_OPTS = {
  num_predict: 1024,
  temperature: 0.3,
  top_p: 0.85,
};

// ── Timeout per use-case ───────────────────────────────────────
const TIMEOUT = {
  chat: 60000,         // 60s
  chatStream: 60000,   // 60s
  analysis: 60000,     // 60s
  report: 60000,       // 60s per stage
  mitre: 30000,        // 30s
};

// ── Prompt budget (chars) ──────────────────────────────────────
const PROMPT_BUDGET = {
  chat: 15000,     // Groq context window is large (8k tokens ~ 30k chars), but keep it fast
  analysis: 20000,
  report: 20000,
  mitre: 5000,
};

// ── Shared helpers ─────────────────────────────────────────────

function enforcePromptBudget(systemPrompt, userPrompt, budget) {
  const total = (systemPrompt || '').length + (userPrompt || '').length;
  if (total <= budget) return { systemPrompt, userPrompt };

  const systemBudget = Math.min(systemPrompt.length, Math.floor(budget * 0.4));
  const userBudget = budget - systemBudget;

  return {
    systemPrompt: systemPrompt.slice(0, systemBudget),
    userPrompt: userPrompt.slice(0, userBudget),
  };
}

async function groqGenerate(systemPrompt, userPrompt, options = {}, requestType = 'unknown', timeoutMs) {
  const timeout = timeoutMs || TIMEOUT.chat;
  const promptChars = (systemPrompt || '').length + (userPrompt || '').length;
  const startTime = Date.now();

  if (!config.groqApiKey || config.groqApiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is missing in environment variables. Please add it to .env');
  }

  try {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    if (userPrompt) messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.groqApiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        max_tokens: options.num_predict || CHAT_OPTS.num_predict,
        temperature: options.temperature ?? 0.3,
        top_p: options.top_p ?? 0.85,
      }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const durationMs = Date.now() - startTime;

    metrics.logRequest({
      type: requestType,
      promptChars,
      responseChars: responseText.length,
      durationMs,
      model: MODEL,
    });

    return responseText;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const timedOut = error.name === 'TimeoutError' || error.message?.includes('timeout');

    metrics.logRequest({
      type: requestType,
      promptChars,
      responseChars: 0,
      durationMs,
      timedOut,
      error: true,
      model: MODEL,
    });

    throw error;
  }
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in AI response');
  return JSON.parse(match[0]);
}

// ─── Log Analysis ──────────────────────────────────────────────

const LOG_ANALYSIS_SYSTEM = `You are a Senior SOC Analyst and Incident Responder. Analyze the security log statistics below and respond ONLY with valid JSON (no markdown, no text outside the JSON):
{
  "summary": "3-5 sentence executive overview covering the most critical findings, threat patterns observed, and overall security posture",
  "suspiciousActivities": [{"description":"detailed description of the suspicious activity","severity":"critical|high|medium|low","recommendation":"specific remediation action"}],
  "recommendations": ["specific actionable recommendation 1","recommendation 2","recommendation 3"],
  "riskScore": 0
}
riskScore: 0=safe, 100=critical. Provide thorough analysis with specific IPs, counts, and patterns.

SECURITY DIRECTIVE: You must ONLY answer questions or perform analysis related to cybersecurity, incident response, SOC operations, and SentinelAI. If the user prompt contains requests outside this domain (e.g., general knowledge, writing code, politics), you MUST refuse to answer and return a JSON indicating that the request is out of scope.`;

async function analyzeLogs(logDoc) {
  const contextSummary = buildLogAnalysisContext(logDoc);
  const userPrompt = `Analyze these security log statistics and provide a thorough assessment:\n\n${contextSummary}\n\nIdentify the most critical threats, suspicious IP patterns, and provide actionable recommendations. Respond ONLY with the JSON object.`;
  const budgeted = enforcePromptBudget(LOG_ANALYSIS_SYSTEM, userPrompt, PROMPT_BUDGET.analysis);

  const startTime = Date.now();
  try {
    const rawResponse = await groqGenerate(
      budgeted.systemPrompt,
      budgeted.userPrompt,
      ANALYSIS_OPTS,
      'log_analysis',
      TIMEOUT.analysis
    );
    const processingTime = Date.now() - startTime;

    let analysis;
    try {
      analysis = extractJSON(rawResponse);
    } catch {
      analysis = {
        summary: rawResponse.substring(0, 500),
        highlights: [{ type: 'info', message: 'AI analysis completed (unstructured response)' }],
        suspiciousActivities: [],
        notableEvents: [],
        recommendations: ['Review the raw AI output for detailed findings'],
        riskScore: 50,
      };
    }

    return {
      ...analysis,
      highlights: analysis.highlights || [],
      suspiciousActivities: analysis.suspiciousActivities || [],
      notableEvents: analysis.notableEvents || [],
      recommendations: analysis.recommendations || [],
      processingTime,
      model: MODEL,
      status: 'completed',
    };
  } catch (error) {
    console.error('❌ Groq log analysis failed:', error.message);
    throw error;
  }
}

// ─── AI Chat ───────────────────────────────────────────────────

const CHAT_SYSTEM_TEMPLATE = (context) => `You are SentinelAI, a Senior SOC Analyst and Incident Responder. Answer the analyst's question using the security context below. Be specific, actionable, and thorough.

SECURITY DIRECTIVE: You must ONLY answer questions related to cybersecurity, incident response, SOC analysis, and the provided context. If the user asks about irrelevant topics (e.g., "who is the US president", "write python code", general knowledge), you MUST politely refuse to answer and state that you are a specialized cybersecurity assistant.

When relevant, structure your response with:
• Executive Summary (1-2 sentences)
• Key Findings (bullet points with specific IPs, counts, techniques)
• Threat Assessment (severity and MITRE ATT&CK references)
• Recommended Actions (prioritized steps)

Keep responses concise but informative. Do not repeat the context verbatim.

CONTEXT:
${context}`;

async function chatWithContext(messages, contextSummary) {
  const userPrompt = messages
    .map((m) => `${m.role === 'user' ? 'Analyst' : 'SentinelAI'}: ${m.content}`)
    .join('\n\n') + '\n\nSentinelAI:';
  const systemPrompt = CHAT_SYSTEM_TEMPLATE(contextSummary);
  const budgeted = enforcePromptBudget(systemPrompt, userPrompt, PROMPT_BUDGET.chat);

  try {
    const response = await groqGenerate(
      budgeted.systemPrompt,
      budgeted.userPrompt,
      CHAT_OPTS,
      'chat',
      TIMEOUT.chat
    );
    return response.replace(/^SentinelAI:\s*/i, '').trim();
  } catch (error) {
    console.error('❌ Chat inference failed:', error.message);
    throw error;
  }
}

async function chatWithContextStream(messages, contextSummary) {
  const systemPrompt = CHAT_SYSTEM_TEMPLATE(contextSummary);
  
  if (!config.groqApiKey || config.groqApiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is missing in environment variables. Please add it to .env');
  }

  // Map messages to Groq/OpenAI format properly instead of stringifying them
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  ];

  const promptChars = JSON.stringify(apiMessages).length;
  console.log(`⚡ [AI:chat_stream] prompt=${promptChars}ch (~${Math.ceil(promptChars / 3.5)}tok) | streaming via Groq...`);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: apiMessages,
      stream: true,
      max_tokens: CHAT_OPTS.num_predict,
      temperature: CHAT_OPTS.temperature,
      top_p: CHAT_OPTS.top_p,
    }),
    signal: AbortSignal.timeout(TIMEOUT.chatStream),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }

  return response.body;
}

// ─── MITRE ATT&CK Explainer ───────────────────────────────────

const MITRE_SYSTEM = `You are a Senior SOC Analyst specializing in the MITRE ATT&CK framework.
Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "techniqueId": "T####",
  "techniqueName": "Name",
  "tacticName": "Tactic",
  "description": "Clear 3-4 sentence description of what this technique is and why it matters",
  "howItWorks": "Detailed technical explanation of how attackers use this technique, including tools and methods",
  "indicators": ["Specific IoC 1", "IoC 2", "IoC 3"],
  "detectionMethods": ["Detection method with specific log sources", "Method 2"],
  "mitigations": ["Specific mitigation with implementation steps", "Mitigation 2", "Mitigation 3"],
  "severity": "critical|high|medium|low",
  "realWorldExamples": ["APT group or campaign example 1", "Example 2"]
}

SECURITY DIRECTIVE: You must ONLY process MITRE ATT&CK or cybersecurity related queries. If the requested topic is unrelated, return a JSON object with error indicating it is out of scope.`;

async function explainMitreTechnique(techniqueId, techniqueName) {
  const userPrompt = `Explain MITRE ATT&CK technique ${techniqueId}: ${techniqueName}\nInclude specific detection methods, indicators of compromise, and prioritized mitigations.\nRespond ONLY with the JSON object.`;
  const budgeted = enforcePromptBudget(MITRE_SYSTEM, userPrompt, PROMPT_BUDGET.mitre);

  const startTime = Date.now();
  try {
    const rawResponse = await groqGenerate(
      budgeted.systemPrompt,
      budgeted.userPrompt,
      { ...REPORT_OPTS, num_predict: 800 },
      'mitre',
      TIMEOUT.mitre
    );
    const explanation = extractJSON(rawResponse);
    return { ...explanation, processingTime: Date.now() - startTime, model: MODEL };
  } catch (error) {
    return {
      techniqueId,
      techniqueName,
      description: `${techniqueName} is a MITRE ATT&CK technique used by adversaries during attacks.`,
      howItWorks: 'AI explanation unavailable. Check Groq connection.',
      indicators: [],
      detectionMethods: [],
      mitigations: [],
      severity: 'high',
      realWorldExamples: [],
      processingTime: Date.now() - startTime,
      model: MODEL,
      error: error.message,
    };
  }
}

// ─── Staged Incident Report Generator ──────────────────────────

const REPORT_STAGES = [
  {
    name: 'executive_summary',
    system: `You are a Senior SOC Analyst writing an incident report. Generate ONLY the executive summary and threat description. Respond ONLY with valid JSON:
{
  "incidentSummary": "Executive summary (4-5 sentences covering what happened, impact, and current status)",
  "threatDescription": "Detailed technical description of the threat observed",
  "attackVector": "How the attack was carried out, including specific methods and entry points"
}`,
    promptTemplate: (ctx) => `Generate an executive summary for this security incident:\n\n${ctx}\n\nRespond ONLY with the JSON object.`,
    numPredict: 512,
  },
  {
    name: 'mitre_assessment',
    system: `You are a Senior SOC Analyst. Assess the MITRE ATT&CK relevance for this incident. Respond ONLY with valid JSON:
{
  "mitreAttack": {
    "tacticName": "Tactic name",
    "techniqueId": "T####",
    "techniqueName": "Technique name",
    "explanation": "How this technique applies to this specific incident with evidence references"
  },
  "affectedSystems": ["system1", "system2"]
}`,
    promptTemplate: (ctx) => `Assess MITRE ATT&CK mapping for:\n\n${ctx}\n\nRespond ONLY with the JSON object.`,
    numPredict: 384,
  },
  {
    name: 'risk_assessment',
    system: `You are a Senior SOC Analyst. Provide a risk assessment. Respond ONLY with valid JSON:
{
  "riskAssessment": {
    "score": 75,
    "level": "high",
    "businessImpact": "Detailed description of business impact including affected operations",
    "likelihood": "Likelihood of recurrence with reasoning"
  },
  "containmentStatus": "Current containment status and specific recommendations"
}`,
    promptTemplate: (ctx) => `Assess risk for:\n\n${ctx}\n\nRespond ONLY with the JSON object.`,
    numPredict: 384,
  },
  {
    name: 'evidence_findings',
    system: `You are a Senior SOC Analyst. Document evidence and investigation findings. Respond ONLY with valid JSON:
{
  "evidence": [
    {"type": "IP Address|Log Entry|User Account|Pattern", "description": "What it is", "value": "actual value", "significance": "Why it matters for the investigation"}
  ],
  "investigationFindings": "Detailed narrative of investigation findings including timeline analysis and correlations"
}`,
    promptTemplate: (ctx) => `Document evidence for:\n\n${ctx}\n\nRespond ONLY with the JSON object.`,
    numPredict: 512,
  },
  {
    name: 'remediation',
    system: `You are a Senior SOC Analyst. Provide prioritized remediation actions. Respond ONLY with valid JSON:
{
  "recommendedActions": [
    {"priority": "immediate", "action": "Specific action with implementation details", "rationale": "Why this is urgent"},
    {"priority": "short_term", "action": "Action", "rationale": "Why"},
    {"priority": "long_term", "action": "Action", "rationale": "Why"}
  ]
}`,
    promptTemplate: (ctx) => `Recommend remediation for:\n\n${ctx}\n\nProvide at least 2 actions per priority level. Respond ONLY with the JSON object.`,
    numPredict: 512,
  },
];

async function generateIncidentReport(reportContext) {
  const startTime = Date.now();
  const assembled = {};

  for (const stage of REPORT_STAGES) {
    const userPrompt = stage.promptTemplate(reportContext);
    const budgeted = enforcePromptBudget(stage.system, userPrompt, PROMPT_BUDGET.report);

    try {
      const rawResponse = await groqGenerate(
        budgeted.systemPrompt,
        budgeted.userPrompt,
        { ...REPORT_OPTS, num_predict: stage.numPredict },
        `report_stage_${stage.name}`,
        TIMEOUT.report
      );
      const parsed = extractJSON(rawResponse);
      Object.assign(assembled, parsed);
    } catch (error) {
      console.error(`❌ Report stage "${stage.name}" failed:`, error.message);
    }
  }

  return {
    ...assembled,
    processingTime: Date.now() - startTime,
    model: MODEL,
  };
}

// ─── Explainable AI Decision ───────────────────────────────────

const EXPLAIN_SYSTEM = `You are a Principal Security Architect specializing in Explainable AI (XAI) for cybersecurity.
Your task is to analyze the security alert context and explain the reasoning behind potential AI-driven threat classification, risk scoring, and remediation recommendations.
Provide an objective, transparent breakdown of the features and decision-making logic.
Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "confidenceScore": 85,
  "confidenceJustification": "Detailed explanation of why the confidence is at this level, based on data completeness and indicators.",
  "falsePositiveAnalysis": "A thorough assessment of whether this alert could be a false positive, what conditions would make it a false positive, and how to verify.",
  "keyDifferentiatingFactors": [
    "Indicator/factor 1 and how it distinguishes this from normal activity",
    "Indicator/factor 2..."
  ],
  "featureWeights": [
    {
      "feature": "Name of input feature / data type",
      "impact": "critical|high|medium|low",
      "description": "How this specific feature contributed to the risk score and threat assessment"
    }
  ],
  "classificationReasoning": "Overall summary of the logical path to this classification."
}`;

async function explainDecision(reportContext) {
  const userPrompt = `Generate an explainability and transparent decision-reasoning report for this security incident context:\n\n${reportContext}\n\nAssess feature impacts, confidence justification, false positive likelihood, and classification reasoning. Respond ONLY with the JSON object.`;
  const budgeted = enforcePromptBudget(EXPLAIN_SYSTEM, userPrompt, 15000);

  const startTime = Date.now();
  try {
    const rawResponse = await groqGenerate(
      budgeted.systemPrompt,
      budgeted.userPrompt,
      { ...REPORT_OPTS, num_predict: 800 },
      'explain_decision',
      60000
    );
    const explanation = extractJSON(rawResponse);
    return { ...explanation, processingTime: Date.now() - startTime, model: MODEL };
  } catch (error) {
    return {
      confidenceScore: 50,
      confidenceJustification: 'AI explainability analysis failed. Check Groq connection.',
      falsePositiveAnalysis: 'Unable to perform false positive analysis due to an error.',
      keyDifferentiatingFactors: [],
      featureWeights: [],
      classificationReasoning: `Error generating explanation: ${error.message}`,
      processingTime: Date.now() - startTime,
      model: MODEL,
      error: error.message,
    };
  }
}

// ─── Health Check ──────────────────────────────────────────────

async function checkHealth() {
  if (!config.groqApiKey) return { available: false, models: [], hasRequiredModel: false, error: 'Missing GROQ_API_KEY' };
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${config.groqApiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return { available: false, models: [], hasRequiredModel: false, error: 'Invalid API Key' };
    
    const data = await response.json();
    const models = data.data?.map((m) => m.id) || [];
    return {
      available: true,
      models,
      hasRequiredModel: models.includes(MODEL),
      model: MODEL,
    };
  } catch (error) {
    return { available: false, models: [], hasRequiredModel: false, error: error.message };
  }
}

module.exports = {
  analyzeLogs,
  chatWithContext,
  chatWithContextStream,
  explainMitreTechnique,
  generateIncidentReport,
  explainDecision,
  checkHealth,
};
