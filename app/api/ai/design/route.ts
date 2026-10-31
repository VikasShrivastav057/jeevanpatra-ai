import { getAppSession } from '../../../../lib/app-auth';
import { runtimeEnv } from '../../../../lib/runtime-env';
import { getGroqTextModels } from '../../../../lib/groq-models';

type Design = {
  name: string; note: string; primary: string; accent: string; paper: string; text: string;
  borderStyle: 'classic' | 'floral' | 'arch' | 'minimal' | 'rounded' | 'oval' | 'circle' | 'double';
  photoShape: 'circle' | 'rounded' | 'square';
  layout: 'classic' | 'portrait-top';
  fontStyle: 'classic' | 'modern' | 'traditional';
  blessing: string;
};

const hex = /^#[0-9a-f]{6}$/i;
const referenceImagePattern = /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/;
const maxReferenceImageLength = 5_600_000;
const fallback: Design = { name: 'AI Heritage', note: 'Custom made for you', primary: '#6f263d', accent: '#c58b3b', paper: '#fffaf0', text: '#3f3230', borderStyle: 'classic', photoShape: 'circle', layout: 'classic', fontStyle: 'traditional', blessing: '' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function luminance(color: string) {
  const values = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function safeColor(value: unknown, paper: string, minimum: number, preferred: string) {
  const candidate = typeof value === 'string' && hex.test(value) ? value.toLowerCase() : preferred;
  if (contrast(candidate, paper) >= minimum) return candidate;
  if (contrast(preferred, paper) >= minimum) return preferred;
  return contrast('#1d1d1d', paper) >= contrast('#ffffff', paper) ? '#1d1d1d' : '#ffffff';
}

function cleanDesign(value: unknown): Design {
  const item = isRecord(value) ? value : {};
  const paper = typeof item.paper === 'string' && hex.test(item.paper) ? item.paper : fallback.paper;
  return {
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 30) : fallback.name,
    note: typeof item.note === 'string' && item.note.trim() ? item.note.trim().slice(0, 55) : fallback.note,
    primary: safeColor(item.primary, paper, 3, fallback.primary),
    accent: safeColor(item.accent, paper, 2.2, fallback.accent),
    paper,
    text: safeColor(item.text, paper, 4.5, fallback.text),
    borderStyle: ['classic', 'floral', 'arch', 'minimal', 'rounded', 'oval', 'circle', 'double'].includes(String(item.borderStyle)) ? item.borderStyle as Design['borderStyle'] : fallback.borderStyle,
    photoShape: ['circle', 'rounded', 'square'].includes(String(item.photoShape)) ? item.photoShape as Design['photoShape'] : fallback.photoShape,
    layout: ['classic', 'portrait-top'].includes(String(item.layout)) ? item.layout as Design['layout'] : fallback.layout,
    fontStyle: ['classic', 'modern', 'traditional'].includes(String(item.fontStyle)) ? item.fontStyle as Design['fontStyle'] : fallback.fontStyle,
    blessing: typeof item.blessing === 'string' ? item.blessing.slice(0, 45) : fallback.blessing,
  };
}

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Please sign in before creating an AI template.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'The design request could not be read.' }, { status: 400 }); }
  if (!isRecord(body)) return Response.json({ error: 'The design request is invalid.' }, { status: 400 });
  const idea = typeof body.idea === 'string' ? body.idea.trim() : '';
  const referenceImage = typeof body.referenceImage === 'string' ? body.referenceImage : '';
  if (idea.length > 1200) return Response.json({ error: 'Keep the design description under 1200 characters.' }, { status: 400 });
  if (referenceImage && (referenceImage.length > maxReferenceImageLength || !referenceImagePattern.test(referenceImage))) return Response.json({ error: 'Upload a valid JPG, PNG or WebP template image under 4 MB.' }, { status: 400 });
  if (!idea && !referenceImage) return Response.json({ error: 'Describe your design or upload a template reference.' }, { status: 400 });
  const apiKey = runtimeEnv.GROQ_API_KEY;
  if (!apiKey) return Response.json({ error: 'Groq is not connected yet.' }, { status: 503 });
  const models = referenceImage
    ? [...new Set([runtimeEnv.GROQ_VISION_MODEL, 'qwen/qwen3.8-27b'].filter(Boolean))] as string[]
    : getGroqTextModels(runtimeEnv.GROQ_MODEL);
  const systemPrompt = 'You design elegant Indian marriage biodata templates. Return only JSON with: name, note, primary, accent, paper, text, borderStyle, photoShape, layout, fontStyle, blessing. Colors must be #RRGGBB. borderStyle must be classic, floral, arch, minimal, rounded, oval, circle, or double, and must follow any border shape explicitly requested by the user or clearly visible in a reference image. photoShape must be circle, rounded, or square. layout must be classic or portrait-top. fontStyle must be classic, modern, or traditional. When a reference image is supplied, closely match its dominant colors, border geometry, ornament density, spacing, typography mood, and portrait placement within this schema. Never copy names, phone numbers, addresses, faces, logos, watermarks, or other personal content from the image. Keep colors readable and tasteful. Use a culturally appropriate blessing only when the user explicitly names a faith or tradition; otherwise use an empty string. Do not add any other keys.';
  const userPrompt = idea || 'Create an editable biodata template that closely follows the uploaded reference image.';
  const userContent = referenceImage ? [
    { type: 'text', text: `${userPrompt}\nStudy the reference as visual inspiration and return the closest editable design possible using the required JSON fields.` },
    { type: 'image_url', image_url: { url: referenceImage } },
  ] : userPrompt;
  let lastError = 'Groq could not create the template.';

  for (const model of models) {
    const options = referenceImage ? { max_completion_tokens: 900 } : model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', max_tokens: 900 } : { max_tokens: 420 };
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.55, ...options, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ] }),
      });
    } catch { lastError = 'Groq could not be reached.'; break; }
    let result: unknown;
    try { result = await response.json(); } catch { result = undefined; }
    const resultRecord = isRecord(result) ? result : {};
    const choices = Array.isArray(resultRecord.choices) ? resultRecord.choices : [];
    const firstChoice = isRecord(choices[0]) ? choices[0] : {};
    const message = isRecord(firstChoice.message) ? firstChoice.message : {};
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    const upstreamError = isRecord(resultRecord.error) && typeof resultRecord.error.message === 'string' ? resultRecord.error.message : undefined;
    if (response.ok && content) {
      try { return Response.json({ design: cleanDesign(JSON.parse(content)) }); } catch { lastError = 'Groq returned a design that could not be read.'; }
    } else lastError = upstreamError || (response.ok ? 'Groq returned an empty design.' : lastError);
    if (response.status !== 400 && response.status !== 404 && !response.ok) break;
  }
  return Response.json({ error: lastError }, { status: 502 });
}

