import assert from 'node:assert/strict';
import { applyFinishingPlan, directFinishingPlan, FinishingPlanError, type FinishContext } from '../lib/finishing-plan';

const baseline: FinishContext = { instruction: '', introduction: 'I work in technology and enjoy reading.', template: 'mahadev-parvati-devotional', mode: 'requested-only', targets: ['colors', 'typography', 'layout', 'spacing'],
 design: { name: 'Current', note: 'Preserve', primary: '#123456', accent: '#987654', paper: '#fffaf0', text: '#112233', borderStyle: 'classic', photoShape: 'circle', layout: 'classic', fontStyle: 'traditional', density: 'airy', blessing: 'ॐ नमः शिवाय', artwork: 'mahadev-radha-krishna', editedProperties: [] },
 fields: [{ id: 'phone', label: 'Phone', section: 'personal', hasValue: true }, { id: 'email', label: 'Email', section: 'personal', hasValue: true }, { id: 'address', label: 'Address', section: 'contact', group: 'Old group', hasValue: true }, { id: 'education', label: 'Education', section: 'personal', hasValue: true }],
 visuals: { frameStyle: 'rounded', backgroundStyle: 'template', colors: { primary: '#123456', accent: '#987654', paper: '#fffaf0', text: '#112233' }, uploadedArtwork: { placement: 'below-details', size: 'large' } },
};
let count = 0;
function run(instruction: string, operations: unknown[], override: Partial<FinishContext> = {}) { count++; const ctx = structuredClone({ ...baseline, ...override, instruction }); const snapshot = structuredClone(ctx); const result = applyFinishingPlan({ operations, unfulfilled: [] }, ctx); assert.deepEqual(ctx, snapshot, 'input state must never mutate'); return result; }
function rejected(instruction: string, operations: unknown[], override: Partial<FinishContext> = {}) { count++; const ctx = structuredClone({ ...baseline, ...override, instruction }); const snapshot = structuredClone(ctx); assert.throws(() => applyFinishingPlan({ operations, unfulfilled: [] }, ctx), FinishingPlanError); assert.deepEqual(ctx, snapshot); }
const op = (target: string, value: unknown, evidence: string, id?: string) => ({ target, value, evidence, ...(id ? { id } : {}) });
const exact = 'Replace the existing text “ॐ नमः शिवाय” with “Jai Shri RadhaKrishna”. Keep it in the same position, with a similar elegant and devotional style, matching the overall biodata theme. Ensure the new text is clear, balanced, and properly aligned. Do not change any other part of the design.';
const move = 'Move the text “Jai Shri RadhaKrishna” slightly downward and a little to the right so the word “Jai” becomes fully visible and clear. Keep the same font style, color, devotional look, and overall design theme. Make sure the full text is properly readable, well aligned, and not overlapping with the background or decorative elements. Do not change anything else in the biodata design.';
const moveDesign = { ...baseline.design, blessingOverride: 'Jai Shri RadhaKrishna' };
for (const artwork of ['template', 'mahadev-radha-krishna', 'radha-krishna-replacement'] as const) {
 const ctx = { ...baseline, instruction: move, design: { ...moveDesign, artwork } }; const saved = structuredClone(ctx);
 const result = applyFinishingPlan(directFinishingPlan(ctx), ctx); count++;
 assert.equal(result.design.blessingOffsetX, 2); assert.equal(result.design.blessingOffsetY, 3); assert.equal(result.changes.length, 2);
 const { blessingOffsetX: _x, blessingOffsetY: _y, editedProperties: _edited, ...other } = result.design; const { editedProperties: _priorEdited, ...original } = ctx.design;
 assert.deepEqual(other, original); assert.deepEqual(result.visuals, ctx.visuals); assert.deepEqual(result.fieldUpdates, []); assert.deepEqual(result.fieldOrder, ctx.fields.map(f => f.id)); assert.equal(result.introduction, ctx.introduction); assert.deepEqual(ctx, saved);
}
for (const [instruction, x, y] of [['Move the blessing text slightly down.', undefined, 3], ['Nudge the blessing text to the left.', -2, undefined], ['Move the blessing text up and right.', 2, -3]] as const) {
 const ctx = { ...baseline, instruction, design: moveDesign }; const result = applyFinishingPlan(directFinishingPlan(ctx), ctx); count++; assert.equal(result.design.blessingOffsetX, x); assert.equal(result.design.blessingOffsetY, y);
}
for (const instruction of ['Move “Jai Shri RadhaKrishna” slightly down.', 'Lower the blessing text slightly.']) { const ctx = { ...baseline, instruction, design: moveDesign }; assert.equal(applyFinishingPlan(directFinishingPlan(ctx), ctx).design.blessingOffsetY, 3); count++; }
const repeated = applyFinishingPlan(directFinishingPlan({ ...baseline, instruction: move, design: { ...moveDesign, blessingOffsetX: 2, blessingOffsetY: 3 } }), { ...baseline, instruction: move, design: { ...moveDesign, blessingOffsetX: 2, blessingOffsetY: 3 } }); count++; assert.equal(repeated.design.blessingOffsetX, 4); assert.equal(repeated.design.blessingOffsetY, 6);
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: move + ' Also use a modern font.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: 'Move the text "Full Name" slightly down.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: 'Move the blessing text 2% right.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: 'Move the blessing text down. Keep the font and also change the paper colour.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: 'Lower the blessing font size.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, design: moveDesign, instruction: 'Use lower-case blessing text.' }), undefined); count++;
rejected('Lower the blessing font size.', [op('design.blessingOffsetY', 3, 'Lower the blessing font size')], { design: moveDesign });
const downEvidence = 'Move the blessing text down';
for (const value of [-5, 9, NaN, Infinity, '3', null]) rejected(downEvidence, [op('design.blessingOffsetY', value, downEvidence)], { design: moveDesign });
rejected('Move the blessing text to the right.', [op('design.blessingOffsetX', -2, 'Move the blessing text to the right')], { design: moveDesign });
rejected('Move the text "Full Name" down.', [op('design.blessingOffsetY', 3, 'Move the text "Full Name" down')], { design: moveDesign });
rejected('Move the blessing text down. Keep the blessing position unchanged.', [op('design.blessingOffsetY', 3, downEvidence)], { design: moveDesign });
rejected(move, [op('design.blessingOffsetY', 3, move)], { design: moveDesign });
rejected('Improve the overall balance and readability.', [op('design.blessingOffsetY', 3, '$selected:header')], { design: moveDesign, targets: ['header'], mode: 'best-version' });
for (const artwork of ['template', 'mahadev-radha-krishna', 'radha-krishna-replacement'] as const) {
 const ctx = structuredClone({ ...baseline, instruction: exact, design: { ...baseline.design, artwork } });
 const r = applyFinishingPlan(directFinishingPlan(ctx), ctx); count++;
 assert.equal(r.design.blessingOverride, 'Jai Shri RadhaKrishna'); assert.equal(r.design.artwork, artwork); assert.deepEqual(r.visuals, baseline.visuals); assert.equal(r.changes.length, 1); assert.deepEqual(r.fieldUpdates, []); assert.equal(r.introduction, baseline.introduction);
}
assert.equal(directFinishingPlan({ ...baseline, instruction: exact + ' Also change the font to modern.' }), undefined); count++;
assert.equal(directFinishingPlan({ ...baseline, instruction: exact + ' Also add a QR code.' }), undefined); count++;
const heading = 'Change only the heading colour to #84252b. Keep the paper, body text, artwork and fields unchanged.';
const r = run(heading, [op('design.primary', '#84252b', 'Change only the heading colour to #84252b')]);
assert.equal(r.design.primary, '#84252b'); assert.equal(r.design.paper, baseline.design.paper); assert.deepEqual(r.fieldOrder, baseline.fields.map(f => f.id)); assert.deepEqual(r.design.editedProperties, ['primary']); assert.equal(r.changes.length, 1);
for (const target of ['design.paper', 'design.text', 'design.accent', 'design.fontStyle', 'design.photoShape', 'artwork', 'introduction', 'fieldOrder']) rejected(heading, [op(target, '#123123', 'Change only the heading colour to #84252b')]);
for (const value of ['#abc', 'red', 'url(javascript:bad)', '<script>x</script>', '#ffffffff', 123, null]) rejected('Change the heading colour to red.', [op('design.primary', value, 'Change the heading colour to red')]);
const rename = 'Rename "Phone" to "Mobile number". Do not change its value or section.';
rejected(heading, [op('design.primary', '#888888', 'Change only the heading colour to #84252b')]);
rejected(rename, [op('field.label', 'Mobile', 'Rename "Phone" to "Mobile number"', 'phone')]);
rejected(rename, [op('field.label', 'Mobile number', 'Rename "Phone" to "Mobile number"', 'phone')], { fields: [...baseline.fields, { id: 'other-phone', label: 'Phone', hasValue: true, section: 'contact' }] });
assert.equal(run('Modern font please.', [op('design.fontStyle', 'modern', 'Modern font please')]).design.fontStyle, 'modern');
assert.deepEqual(run(rename, [op('field.label', 'Mobile number', 'Rename "Phone" to "Mobile number"', 'phone')]).fieldUpdates, [{ id: 'phone', label: 'Mobile number' }]);
rejected(rename, [op('field.section', 'contact', 'Rename "Phone" to "Mobile number"', 'phone')]);
rejected(rename, [op('field.label', 'New email', 'Rename "Phone" to "Mobile number"', 'email')]);
rejected(rename, [op('field.value', 'changed', 'Rename "Phone" to "Mobile number"', 'phone')]);
const group = 'Move Phone and Email into Contact. Group Address under Residential Address.';
assert.equal(run(group, [op('field.section', 'contact', 'Move Phone and Email into Contact', 'phone'), op('field.section', 'contact', 'Move Phone and Email into Contact', 'email'), op('field.group', 'Residential Address', 'Group Address under Residential Address', 'address')]).fieldUpdates.length, 3);
for (const instruction of ['Use a modern font. Keep the photo unchanged.', 'Make the profile photo square. Keep colours and fonts unchanged.', 'Reduce the spacing. Keep everything else unchanged.']) {
 const target = instruction.startsWith('Use') ? 'design.fontStyle' : instruction.startsWith('Make') ? 'design.photoShape' : 'design.density';
 const value = target.endsWith('fontStyle') ? 'modern' : target.endsWith('photoShape') ? 'square' : 'compact';
 assert.equal(run(instruction, [op(target, value, instruction.split('.')[0])]).changes.length, 1);
}
rejected('Make my name font larger.', [op('design.fontStyle', 'modern', 'Make my name font larger')]);
assert.equal(run('Make my name larger.', [op('design.nameSize', 'large', 'Make my name larger')]).design.nameSize, 'large');
for (const instruction of ['Do not change the fonts.', 'Keep the fonts as they are.', 'Preserve my original fonts.', 'Never change the font style.']) rejected(instruction, [op('design.fontStyle', 'modern', instruction)]);
rejected('Use a modern font. Keep the fonts unchanged.', [op('design.fontStyle', 'modern', 'Use a modern font')]);
rejected('Change only the heading colour.', [op('design.fontStyle', 'modern', '$selected:typography')], { mode: 'best-version' });
rejected(exact, [op('design.primary', '#84252b', '$selected:colors')], { mode: 'best-version' });
rejected('Use a modern font. Make it elegant.', [op('design.primary', '#84252b', '$selected:colors')], { mode: 'balanced' });
assert.equal(run('Improve the overall balance and readability.', [op('design.fontStyle', 'modern', '$selected:typography')], { mode: 'best-version' }).design.fontStyle, 'modern');
rejected('Improve the overall balance and readability.', [op('design.blessingOverride', 'Other faith', '$selected:header')], { mode: 'best-version', targets: ['header'] });
rejected('Improve the overall balance and readability.', [op('artwork', 'template', '$selected:photo')], { mode: 'best-version', targets: ['photo'] });
const image = 'Only replace the Mahadev and Parvati image with Radha Krishna. Keep all other things unchanged.';
assert.equal(run(image, [op('artwork', 'radha-krishna-replacement', image.split('.')[0])]).design.artwork, 'radha-krishna-replacement');
rejected(exact, [op('artwork', 'radha-krishna-replacement', exact)]);
const upload = 'Move my uploaded image below the details and make my uploaded image small.';
const u = run(upload, [op('uploadedArtwork.placement', 'below-details', upload), op('uploadedArtwork.size', 'small', upload)]); assert.equal(u.visuals.uploadedArtwork?.size, 'small'); assert.equal(u.design.artwork, baseline.design.artwork);
rejected(upload, [op('uploadedArtwork.size', 'small', upload)], { visuals: { ...baseline.visuals, uploadedArtwork: undefined } });
rejected('Make the border oval.', [op('frameStyle', 'oval', 'Make the border oval')]);
assert.equal(run('Make the border oval.', [op('frameStyle', 'oval', 'Make the border oval')], { template: 'classic-red' }).visuals.frameStyle, 'oval');
rejected('Use a dotted background print.', [op('backgroundStyle', 'dots', 'Use a dotted background print')]);
assert.equal(run('Use a dotted background print.', [op('backgroundStyle', 'dots', 'Use a dotted background print')], { template: 'classic-red' }).visuals.backgroundStyle, 'dots');
rejected('Change the layout to portrait-top.', [op('design.layout', 'portrait-top', 'Change the layout to portrait-top')]);
rejected('Use a modern font and reduce spacing.', [op('design.fontStyle', 'modern', 'Use a modern font and reduce spacing')]);
rejected('Use a modern font.', [op('design.fontStyle', 'modern', 'invented evidence')]);
rejected('Use a modern font.', [op('design.fontStyle', 'modern', 'Use a modern font'), op('design.fontStyle', 'classic', 'Use a modern font')]);
rejected('Use a modern font.', [op('template', 'peacock', 'Use a modern font')]);
rejected('Use a modern font.', [op('__proto__', 'bad', 'Use a modern font')]);
rejected('Reorder all fields.', [op('fieldOrder', ['phone'], 'Reorder all fields')]);
const reorderPrompt = 'Move Education above Phone. Keep all values, labels, sections and the entire design unchanged.';
const reorderContext = { ...baseline, instruction: reorderPrompt };
const reordered = applyFinishingPlan(directFinishingPlan(reorderContext), reorderContext); count++;
assert.deepEqual(reordered.fieldOrder, ['education', 'phone', 'address', 'email']); assert.deepEqual(reordered.fieldUpdates, []); assert.equal(reordered.changes.length, 1); assert.equal(reordered.changes[0].label, 'Field order'); assert.deepEqual(reordered.design, baseline.design); assert.deepEqual(reordered.visuals, baseline.visuals); assert.equal(reordered.introduction, baseline.introduction);
const customNames = { ...baseline, fields: [{ id: 'h', label: 'Height', section: 'personal' as const, hasValue: true }, { id: 'age', label: 'Age Range', section: 'personal' as const, hasValue: true }] };
assert.deepEqual(applyFinishingPlan(directFinishingPlan({ ...customNames, instruction: 'Swap Height and Age Range.' }), { ...customNames, instruction: 'Swap Height and Age Range.' }).fieldOrder, ['age', 'h']); count++;
rejected('Use a modern font.', [op('fieldOrder', ['education', 'phone', 'address', 'email'], 'Use a modern font')]);
rejected('Move Education above Phone.', [op('fieldOrder', ['phone', 'education', 'address', 'email'], 'Move Education above Phone')]);
rejected('Move Education above Phone.', [op('field.section', 'contact', 'Move Education above Phone', 'education')]);
rejected('Move Education above Phone. Use a modern font.', [op('design.fontStyle', 'modern', 'Use a modern font')]);
rejected('Reorder all fields.', [op('fieldOrder', ['phone', 'email', 'address', 'education', 'invented'], 'Reorder all fields')]);
rejected('Reorder all fields.', [op('fieldOrder', ['phone', 'email', 'address', 'phone'], 'Reorder all fields')]);
assert.equal(directFinishingPlan({ ...baseline, instruction: exact + ' Reorder all fields alphabetically.' }), undefined); count++;
const scopedAlphabetical = 'Sort personal fields alphabetically and use a modern font.';
const scopedOrderFields = [{ id: 'z', label: 'Z personal', section: 'personal' as const, hasValue: true }, { id: 'a', label: 'A personal', section: 'personal' as const, hasValue: true }, { id: 'fz', label: 'Z family', section: 'family' as const, hasValue: true }, { id: 'fa', label: 'A family', section: 'family' as const, hasValue: true }];
assert.deepEqual(run(scopedAlphabetical, [op('fieldOrder', ['a', 'z', 'fz', 'fa'], scopedAlphabetical), op('design.fontStyle', 'modern', scopedAlphabetical)], { fields: scopedOrderFields }).fieldOrder, ['a', 'z', 'fz', 'fa']);
rejected(scopedAlphabetical, [op('fieldOrder', ['a', 'z', 'fa', 'fz'], scopedAlphabetical), op('design.fontStyle', 'modern', scopedAlphabetical)], { fields: scopedOrderFields });
assert.equal(run('Do not change anything.', []).changes.length, 0);
const gradient = 'linear-gradient(145deg,#fffdf7,#fff5e7)';
const gradientResult = run(heading, [op('design.primary', '#84252b', 'Change only the heading colour to #84252b')], { template: 'classic-red', design: { ...baseline.design, paper: gradient }, visuals: { ...baseline.visuals, colors: { ...baseline.visuals.colors, paper: gradient } } });
assert.equal(gradientResult.design.paper, gradient); assert.equal(gradientResult.visuals.colors.paper, gradient);
for (const template of ['mahadev-parvati-devotional', 'pearl-jewel-luxe', 'emerald-gold-registry']) rejected('Change the paper colour to white.', [op('design.paper', '#ffffff', 'Change the paper colour to white')], { template });
assert.throws(() => applyFinishingPlan({ operations: [op('design.fontStyle', 'modern', 'Use a modern font')], unfulfilled: ['Upload a new image to replace the deity.'] }, { ...baseline, instruction: 'Use a modern font and create a new deity image.' }), FinishingPlanError); count++;
console.log(`${count} finishing isolation, preservation, invalid-plan, multi-request and image checks passed.`);
