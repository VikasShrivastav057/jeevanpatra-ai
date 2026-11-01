# Artwork replacement

In **Finish my biodata**, choose **Generate or replace artwork with AI**. Describe the new subject and adjust the highlighted area. An artwork request entered in the main finishing instruction opens this editor too. Subjects are free-form, rather than limited to deity presets.

An optional reference upload is private until the customer checks the explicit OpenAI sharing consent. The profile portrait and biodata values are never part of the image request. Only the clean template background, artwork instruction, and opted-in artwork reference are sent.

Review the replacement in the biodata, then **Apply artwork & save**. Cancelling or discarding a preview does not update the saved biodata. A storage failure leaves the editor unchanged and permits retrying the save. Restore original artwork is available. Background replacement is independent of the template/layout and uses an owner-scoped generated image, retained across reload and PDF export.

The editor currently supports templates with raster backgrounds: the three devotional posters, Pearl Jewel Luxe, and Emerald Gold Registry. Other templates continue to support uploaded images and existing design controls. Select the area carefully: pixels outside it are copied directly from the original, while pixels inside it can change with the generated artwork. AI results require visual review.

## Server configuration

- `OPENAI_API_KEY`: server-only image API key, stored as a Vercel Production Secret. Requires API billing credit and image-model access.
- `OPENAI_IMAGE_MODEL`: optional; defaults to `gpt-image-2.5-sunburst`.
- Existing account database and private Blob storage must be configured.

Requests create one medium-quality 1024×1536 image, with no automatic paid retries. Up to five attempts per account per hour are allowed. Identical retries with the same request ID reuse a previously stored result. An in-flight lock prevents duplicate requests within a server instance. The database-backed hourly count also applies across instances; strict concurrent cross-instance reservation is not implemented.

The server validates template/variant, image ownership, edit bounds, generated-image dimensions, consent and provider responses. It composites only the selected area back into the original-resolution background. A billing/access/provider/storage failure returns a readable error and never applies changes.

## Verification

- `node scripts/test-artwork-generation.mjs`: actual handler with external boundaries replaced; routing, privacy, owner isolation, reference consent, retry reuse, billing errors and exact outside-area pixels.
- `node scripts/run-finishing-tests.mjs`: existing text, layout, field order and portrait editing regressions.
- Browser verification covers customer desktop and admin mobile, review before applying, save failure/retry, reload, reference opt-in, restore and the real PDF export flow.

Real image generation was attempted during setup but the connected OpenAI account returned `billing_hard_limit_reached`. Model lookup succeeded; a successful live image generation still needs verification after billing is enabled. Simulated image responses verify application behavior, not image quality or prompt fidelity.
