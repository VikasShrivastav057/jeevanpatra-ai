import { getAppSession } from '../../../../lib/app-auth';
import { runtimeEnv } from '../../../../lib/runtime-env';
import { getGroqTextModels } from '../../../../lib/groq-models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Please sign in before using AI.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'The writing request could not be read.' }, { status: 400 }); }
  if (!isRecord(body)) return Response.json({ error: 'The writing request is invalid.' }, { status: 400 });
  const introduction = typeof body.introduction === 'string' ? body.introduction.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const tone = (typeof body.tone === 'string' && ['warm', 'concise', 'traditional'].includes(body.tone) ? body.tone : 'warm') as 'warm' | 'concise' | 'traditional';
  const toneInstruction = {
    warm: 'Use warm, personable language in 45–75 words.',
    concise: 'Be direct and polished in 25–40 words, removing repetition.',
    traditional: 'Use respectful, family-oriented language with a graceful traditional Indian biodata style in 45–75 words.',
  }[tone];
  if (!introduction || introduction.length > 1600) return Response.json({ error: 'Add a short introduction first.' }, { status: 400 });
  const apiKey = runtimeEnv.GROQ_API_KEY;
  if (!apiKey) return Response.json({ error: 'Groq is not connected yet. Add the Groq API key to activate AI writing.' }, { status: 503 });
  const configuredModel = runtimeEnv.GROQ_MODEL;
  const models = getGroqTextModels(configuredModel);
  let lastError = 'Groq could not complete the rewrite.';

  for (const model of models) {
    const generationOptions = model.startsWith('openai/gpt-oss')
      ? { reasoning_effort: 'low', max_tokens: 700 }
      : { max_tokens: 220 };
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model, temperature: 0.65, ...generationOptions,
          messages: [
            { role: 'system', content: `You are an expert Indian marriage biodata editor. Rewrite only the supplied introduction. Keep every fact accurate and avoid exaggeration, stereotypes, or invented details. ${toneInstruction} Return only the rewritten paragraph.` },
            { role: 'user', content: `Name: ${name || 'Not supplied'}\nPreferred tone: ${tone}\nIntroduction: ${introduction}` },
          ],
        }),
      });
    } catch { lastError = 'Groq could not be reached.'; break; }
    let result: unknown;
    try { result = await response.json(); } catch { result = undefined; }
    const resultRecord = isRecord(result) ? result : {};
    const choices = Array.isArray(resultRecord.choices) ? resultRecord.choices : [];
    const firstChoice = isRecord(choices[0]) ? choices[0] : {};
    const message = isRecord(firstChoice.message) ? firstChoice.message : {};
    const improved = typeof message.content === 'string' ? message.content.trim() : '';
    const upstreamError = isRecord(resultRecord.error) && typeof resultRecord.error.message === 'string' ? resultRecord.error.message : undefined;
    if (response.ok && improved) {
      const withoutControls = Array.from(improved).filter((character) => {
        const code = character.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      }).join('').trim();
      const introduction = withoutControls.length <= 1600
        ? withoutControls
        : withoutControls.slice(0, 1600).replace(/\s+\S*$/, '').trim();
      if (introduction) return Response.json({ introduction });
    }
    lastError = upstreamError || (response.ok ? 'Groq returned an empty response.' : lastError);
    const modelUnavailable = response.status === 400 || response.status === 404;
    if (!modelUnavailable) break;
  }

  return Response.json({ error: lastError }, { status: 502 });
}

