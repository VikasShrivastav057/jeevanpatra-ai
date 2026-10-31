import assert from 'node:assert/strict';
import { a4Ratio, defaultPhotoCrop, isPhotoAdjustment, boundPhotoPlacement, resizePhoto, dragPhotoCrop, sameExceptPhotoAdjustment } from '../lib/photo-adjustment.ts';
assert.equal(isPhotoAdjustment({ crop: defaultPhotoCrop }), true);
for (const crop of [{ x: -1, y: 50, zoom: 1 }, { x: 50, y: 101, zoom: 1 }, { x: 50, y: 50, zoom: .9 }, { x: 50, y: 50, zoom: 3.1 }, { x: NaN, y: 18, zoom: 1 }, { x: '50', y: 18, zoom: 1 }, { x: 50, y: 18, zoom: Infinity }, { x: 50, y: 18, zoom: 1, transform: 'bad' }]) assert.equal(isPhotoAdjustment({ crop }), false);
for (const width of [10, 25, 45, -20, 500]) for (const x of [-200, 0, 45, 200]) for (const y of [-200, 0, 45, 200]) {
 const p = boundPhotoPlacement({ x, y, width }); assert.equal(isPhotoAdjustment({ crop: defaultPhotoCrop, placement: p }), true); assert.ok(p.x + p.width <= 100.001); assert.ok(p.y + p.width * a4Ratio <= 100.001);
}
for (const placement of [{ x: 90, y: 0, width: 25 }, { x: 0, y: 99, width: 25 }, { x: 0, y: 0, width: 50 }, { x: 0, y: 0, width: 0 }, { x: NaN, y: 0, width: 25 }, { x: 0, y: 0, width: '25' }]) assert.equal(isPhotoAdjustment({ crop: defaultPhotoCrop, placement }), false);
const old = { x: 20, y: 20, width: 20 }; const resized = resizePhoto(old, 30); assert.equal(resized.x + resized.width / 2, old.x + old.width / 2); assert.ok(Math.abs(resized.y + resized.width * a4Ratio / 2 - old.y - old.width * a4Ratio / 2) < .001);
const centered = { x: 50, y: 50, zoom: 2 };
assert.deepEqual(dragPhotoCrop(centered, 0, 0, 200, 200, 400, 400), centered);
assert.deepEqual(dragPhotoCrop(centered, 100, -100, 200, 200, 400, 400), { x: 0, y: 100, zoom: 2 });
assert.deepEqual(dragPhotoCrop({ ...centered, zoom: 1 }, 100, 100, 200, 200, 400, 400), { ...centered, zoom: 1 });
assert.equal(dragPhotoCrop(defaultPhotoCrop, 100, 0, 200, 200, 800, 400).x, 0);
assert.deepEqual(dragPhotoCrop(centered, 10, 10, 0, 0, 400, 400), centered);
const base = { name: 'QA', fields: [1, 2], design: { primary: '#112233' } };
assert.equal(sameExceptPhotoAdjustment(JSON.stringify(base), JSON.stringify({ ...base, photoAdjustment: { crop: centered } })), true);
assert.equal(sameExceptPhotoAdjustment(JSON.stringify(base), JSON.stringify({ ...base, name: 'Changed', photoAdjustment: { crop: centered } })), false);
assert.equal(sameExceptPhotoAdjustment('', JSON.stringify(base)), false);
assert.equal(sameExceptPhotoAdjustment('bad JSON', JSON.stringify(base)), false);
assert.equal(isPhotoAdjustment({ crop: defaultPhotoCrop, url: 'https://other-file' }), false);
console.log('Photo crop geometry, page boundaries, resize, validation and completion checks passed.');

