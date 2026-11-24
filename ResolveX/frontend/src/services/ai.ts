import { API_BASE } from '../data/servers';
import type { Finding } from '../detective/engine';

export interface AiStatus {
  available: boolean;
  model: string | null;
}

export interface ExplainContext {
  domain: string;
  testsPerServer: number;
  timeoutMs: number;
}

function base(): string {
  return (API_BASE || '').replace(/\/$/, '');
}

/** Does the backend have an AI provider configured? Never throws — false on any error. */
export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch(`${base()}/api/ai-status`);
    if (!res.ok) return { available: false, model: null };
    const data = await res.json();
    return { available: data.available === true, model: typeof data.model === 'string' ? data.model : null };
  } catch {
    return { available: false, model: null };
  }
}

/**
 * Ask the backend to rephrase one finding in friendlier prose.
 * The deterministic finding is untouched — this only adds an explanation string.
 * Throws a user-friendly Error when AI is unavailable (caller falls back).
 */
export async function enhanceFinding(finding: Finding, context: ExplainContext): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${base()}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finding: {
          id: finding.id,
          title: finding.title,
          summary: finding.summary,
          severity: finding.severity,
          category: finding.category,
          evidence: finding.evidence,
          possibleCauses: finding.possibleCauses,
          recommendedActions: finding.recommendedActions,
          limitations: finding.limitations,
          confidence: finding.confidence,
        },
        context,
      }),
    });
  } catch {
    throw new Error('AI service is unreachable. Showing the built-in analysis instead.');
  }
  if (res.status === 503) throw new Error('AI explanations are not configured. Showing the built-in analysis instead.');
  if (!res.ok) throw new Error('The AI service is temporarily unavailable. Showing the built-in analysis instead.');
  const data = await res.json();
  if (!data || typeof data.explanation !== 'string' || data.explanation.trim().length === 0) {
    throw new Error('The AI service returned an empty response. Showing the built-in analysis instead.');
  }
  return data.explanation;
}
