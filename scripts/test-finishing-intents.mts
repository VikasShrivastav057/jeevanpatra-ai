import assert from 'node:assert/strict';
import { readBlessingEdit } from '../lib/blessing-edit.ts';
import { resolveDevotionalArtwork, requestsDevotionalArtwork } from '../lib/devotional-artwork.ts';
import { requestsFieldEdits } from '../lib/finishing-intent.ts';

const prompt = 'Replace the existing text “ॐ नमः शिवाय” with “Jai Shri RadhaKrishna”. Keep it in the same position, with a similar elegant and devotional style, matching the overall biodata theme. Ensure the new text is clear, balanced, and properly aligned. Do not change any other part of the design.';
assert.equal(readBlessingEdit(prompt, 'ॐ नमः शिवाय'), 'Jai Shri RadhaKrishna');
assert.equal(requestsDevotionalArtwork(prompt), false);
assert.equal(requestsFieldEdits(prompt), false);
for (const current of ['template', 'mahadev-radha-krishna', 'radha-krishna-replacement']) {
  assert.equal(resolveDevotionalArtwork(prompt, 'mahadev-parvati-devotional', current), current);
}
assert.equal(requestsDevotionalArtwork(prompt + ' Do not change any image.'), false);
assert.equal(resolveDevotionalArtwork('Add a Radha Krishna image opposite Mahadev.', 'mahadev-parvati-devotional'), 'mahadev-radha-krishna');
assert.equal(resolveDevotionalArtwork('Only replace the Mahadev and Parvati image with Radha Krishna.', 'mahadev-parvati-devotional'), 'radha-krishna-replacement');
assert.equal(readBlessingEdit('Replace "Full Name" with "Name".', 'ॐ नमः शिवाय'), undefined);
assert.equal(readBlessingEdit('Change "Jai Shri RadhaKrishna" to "Blessings".', 'Jai Shri RadhaKrishna'), 'Blessings');
assert.equal(readBlessingEdit('Replace "ॐ नमः शिवाय" with "".', 'ॐ नमः शिवाय'), '');
assert.equal(readBlessingEdit('Replace "ॐ नमः शिवाय" with "God\'s blessings".', 'ॐ नमः शिवाय'), "God's blessings");
console.log('Blessing-text isolation and artwork intent regression checks passed.');

