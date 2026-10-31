import { getAppSession } from '../../../../lib/app-auth';
import { runtimeEnv } from '../../../../lib/runtime-env';
import { getGroqTextModels } from '../../../../lib/groq-models';
import { getTemplateById, type TemplateId } from '../../../../lib/template-catalog';
import { applyFinishingPlan, directFinishingPlan, finishTargets, finishingPlannerInstruction, FinishingPlanError, isRecord, userInstruction, type FieldSummary, type FinishContext, type FinishVisuals, type FinishTarget } from '../../../../lib/finishing-plan';
import type { TemplateDesign } from '../../../../components/biodata-paper';
import { isBlessingOffset } from '../../../../lib/blessing-position';

const sections = ['personal', 'family', 'contact', 'preferences'];
const hex = /^#[\da-f]{6}$/i;
const frameStyles = ['template', 'square', 'rounded', 'arch', 'oval', 'circle', 'double'];
const backgroundStyles = ['template', 'plain', 'parchment', 'dots', 'geometric', 'weave', 'radiant'];
const fail = (error: string, status = 400) => Response.json({ error }, { status });

function currentDesign(value: unknown, template: string): TemplateDesign | undefined {
  const base = getTemplateById(template as TemplateId);
  if (value === undefined || value === null) {
    if (!base) return undefined;
    return { name: base.name, note: base.editorNote, primary: base.theme.primary, accent: base.theme.accent, paper: base.theme.paper, text: base.theme.text, borderStyle: 'classic', photoShape: 'circle', layout: 'classic', fontStyle: 'classic', density: 'balanced', blessing: base.blessing, artwork: 'template', editedProperties: [] };
  }
  if (!isRecord(value) || !['name', 'note', 'blessing'].every(key => typeof value[key] === 'string') || !['primary', 'accent', 'text'].every(key => typeof value[key] === 'string' && hex.test(value[key] as string)) || typeof value.paper !== 'string' || !hex.test(value.paper) && value.paper !== base?.theme.paper) return undefined;
  if (!['classic', 'floral', 'arch', 'minimal', 'rounded', 'oval', 'circle', 'double'].includes(String(value.borderStyle)) || !['circle', 'rounded', 'square'].includes(String(value.photoShape)) || !['classic', 'portrait-top'].includes(String(value.layout)) || !['classic', 'modern', 'traditional'].includes(String(value.fontStyle))) return undefined;
  if (value.blessingOverride !== undefined && (typeof value.blessingOverride !== 'string' || value.blessingOverride.length > 120) || value.editedProperties !== undefined && (!Array.isArray(value.editedProperties) || value.editedProperties.some(v => typeof v !== 'string'))) return undefined;
  if (value.blessingOffsetX !== undefined && !isBlessingOffset(value.blessingOffsetX, 'x') || value.blessingOffsetY !== undefined && !isBlessingOffset(value.blessingOffsetY, 'y')) return undefined;
  if (value.density !== undefined && (typeof value.density !== 'string' || !['compact', 'balanced', 'airy'].includes(value.density)) || value.nameSize !== undefined && (typeof value.nameSize !== 'string' || !['small', 'normal', 'large'].includes(value.nameSize)) || value.artwork !== undefined && (typeof value.artwork !== 'string' || !['template', 'mahadev-radha-krishna', 'radha-krishna-replacement'].includes(value.artwork))) return undefined;
  const keys = ['name', 'note', 'primary', 'accent', 'paper', 'text', 'borderStyle', 'photoShape', 'layout', 'fontStyle', 'density', 'blessing', 'blessingOverride', 'blessingOffsetX', 'blessingOffsetY', 'artwork', 'nameSize', 'editedProperties'];
  const design = Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]])) as TemplateDesign;
  if (base && design.blessingOverride === undefined) design.blessing = base.blessing;
  return design;
}

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return fail('Please sign in before using AI finishing.', 401);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('The finishing request could not be read.'); }
  if (!isRecord(body)) return fail('The finishing request is invalid.');
  if (typeof body.name !== 'string' || body.name.length > 120 || typeof body.introduction !== 'string' || body.introduction.length > 1600) return fail('Check your name and introduction length.');
  if (typeof body.recommendation !== 'string' || body.recommendation.length > 1600 || !userInstruction(body.recommendation)) return fail('Describe the exact changes you want.');
  if (typeof body.currentTemplate !== 'string' || body.currentTemplate.length > 120) return fail('Choose a valid template.');
  const template = body.currentTemplate.split(':')[0].trim();
  const design = currentDesign(body.currentDesign, template);
  if (!design || template !== 'ai-custom' && !getTemplateById(template as TemplateId)) return fail('Your current design could not be read. Reload the editor and try again.');
  if (!Array.isArray(body.fields) || body.fields.length > 100) return fail('Supply at most 100 field summaries.');
  const fields: FieldSummary[] = [];
  for (const field of body.fields) {
    if (!isRecord(field) || Object.keys(field).some(key => !['id', 'label', 'section', 'hasValue', 'group'].includes(key)) || typeof field.id !== 'string' || !field.id.trim() || field.id.length > 100 || fields.some(f => f.id === field.id) || typeof field.label !== 'string' || field.label.length > 120 || !sections.includes(String(field.section)) || typeof field.hasValue !== 'boolean' || field.group !== undefined && (typeof field.group !== 'string' || field.group.length > 80)) return fail('Supply unique field IDs and labels, without personal field values.');
    fields.push(field as FieldSummary);
  }
  const visuals: FinishVisuals = { frameStyle: 'template', backgroundStyle: 'template', colors: { primary: design.primary, accent: design.accent, paper: design.paper, text: design.text } };
  if (body.currentVisuals !== undefined) {
    const v = body.currentVisuals;
    if (!isRecord(v) || !frameStyles.includes(String(v.frameStyle)) || !backgroundStyles.includes(String(v.backgroundStyle)) || !isRecord(v.colors) || !['primary', 'accent', 'text'].every(key => typeof (v.colors as Record<string, unknown>)[key] === 'string' && hex.test((v.colors as Record<string, string>)[key])) || typeof v.colors.paper !== 'string' || !hex.test(v.colors.paper) && v.colors.paper !== getTemplateById(template as TemplateId)?.theme.paper) return fail('Your current visual settings could not be read.');
    visuals.frameStyle = v.frameStyle as FinishVisuals['frameStyle']; visuals.backgroundStyle = v.backgroundStyle as FinishVisuals['backgroundStyle']; visuals.colors = v.colors as FinishVisuals['colors'];
    if (v.uploadedArtwork !== undefined) {
      if (!isRecord(v.uploadedArtwork) || !['replace-header', 'above-details', 'below-details'].includes(String(v.uploadedArtwork.placement)) || !['small', 'medium', 'large'].includes(String(v.uploadedArtwork.size)) || Object.keys(v.uploadedArtwork).some(key => !['placement', 'size'].includes(key))) return fail('Check the uploaded image settings.');
      visuals.uploadedArtwork = v.uploadedArtwork as NonNullable<FinishVisuals['uploadedArtwork']>;
    }
  }
  if (body.changeTargets !== undefined && (!Array.isArray(body.changeTargets) || body.changeTargets.some(t => !finishTargets.includes(t as FinishTarget)))) return fail('Choose valid change areas.');
  if (body.improvementMode !== undefined && (typeof body.improvementMode !== 'string' || !['requested-only', 'balanced', 'best-version'].includes(body.improvementMode))) return fail('Choose a valid improvement approach.');
  const ctx: FinishContext = { instruction: userInstruction(body.recommendation), introduction: body.introduction, fields, design, visuals, template, targets: body.changeTargets as FinishTarget[] || [], mode: body.improvementMode as FinishContext['mode'] || 'requested-only' };
  try {
    const direct = directFinishingPlan(ctx);
    if (direct) {
      const orderEdit = isRecord(direct) && Array.isArray(direct.operations) && direct.operations.some(op => isRecord(op) && op.target === 'fieldOrder');
      return Response.json({ ...applyFinishingPlan(direct, ctx), model: orderEdit ? 'field-order-edit' : 'header-text-edit' });
    }
  } catch (error) { return fail(error instanceof Error ? error.message : 'The requested edit could not be applied.', 422); }
  const apiKey = runtimeEnv.GROQ_API_KEY;
  if (!apiKey) return fail('Groq is not connected yet.', 503);
  let lastError = 'AI could not prepare a verified edit plan. Nothing was changed. Please try again.';
  const deadline = Date.now() + 48_000;
  for (const model of getGroqTextModels(runtimeEnv.GROQ_MODEL)) {
    if (Date.now() >= deadline) return fail('AI took too long. Nothing was changed. Please retry.', 504);
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, signal: AbortSignal.any([request.signal, AbortSignal.timeout(Math.min(40_000, deadline - Date.now()))]),
        body: JSON.stringify({ model, temperature: 0, max_tokens: 3200, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'medium' } : {}), response_format: { type: 'json_object' }, messages: [{ role: 'system', content: finishingPlannerInstruction }, { role: 'user', content: JSON.stringify({ ...ctx, stylePreference: typeof body.stylePreference === 'string' ? body.stylePreference.slice(0, 80) : 'Traditional' }) }] }),
      });
    } catch { return fail('AI took too long or could not be reached. Nothing was changed. Please retry.', 502); }
    let upstream: unknown;
    try { upstream = await response.json(); } catch { upstream = undefined; }
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) continue;
      if (response.status === 429) { lastError = 'AI is busy. Nothing was changed. Please try again shortly.'; continue; }
      return fail('The AI service could not complete this request. Nothing was changed.', 502);
    }
    const choices = isRecord(upstream) && Array.isArray(upstream.choices) ? upstream.choices : [];
    const message = isRecord(choices[0]) && isRecord(choices[0].message) ? choices[0].message : {};
    try {
      const plan: unknown = JSON.parse(typeof message.content === 'string' ? message.content : '');
      if (isRecord(plan) && Array.isArray(plan.unfulfilled) && plan.unfulfilled.length) return fail(`Nothing was changed. ${plan.unfulfilled.filter(x => typeof x === 'string').join(' ').slice(0, 600)}`, 422);
      return Response.json({ ...applyFinishingPlan(plan, ctx), model });
    } catch (error) { lastError = error instanceof FinishingPlanError ? error.message : 'AI returned an unreadable edit plan. Nothing was changed. Please retry.'; }
  }
  return fail(lastError, lastError.startsWith('AI is busy') ? 503 : 422);
}
