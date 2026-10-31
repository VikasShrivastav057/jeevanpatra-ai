# AI finishing: scoped edits and verification

Implemented 31 October 2026.

## Behaviour

- The planner returns allowlisted operations with evidence from the actual written instruction, instead of a replacement design.
- The server validates each operation, property, value, field ID, target scope and preservation instruction. Invalid, contradictory, unsupported or incomplete plans leave the document unchanged. Literal quoted blessing/label replacements and literal hex colours are checked exactly.
- A narrow request cannot borrow permission from checked improvement areas. Broader optimisation requires an explicit broad request and a compatible improvement mode. Photo, artwork, fields, introduction and blessing always need written instructions.
- Field values, profile photo files, selected templates and uploaded image files cannot be replaced by the planner. Images are not sent to Groq. Only field summaries, the introduction, visual settings and the customer's written request are sent.
- The customer reviews an actual computed before/after list before saving. Discard, cancel and stale responses cannot apply changes. Failed persistence leaves the editor unchanged and allows retry.
- Current manual colour settings, original gradient paper, existing groups and earlier blessing/artwork edits survive unrelated requests.
- Devotional text can be nudged independently with `design.blessingOffsetX` and `design.blessingOffsetY`. These bounded offsets translate only the editable text, including on illustrated templates; they preserve its font, size, colour, content, other layout positions and background artwork. Small unquantified directional requests are resolved directly; quantified/compound requests use the planner. Moving unrelated text or moving against the requested direction is rejected. Restoring the original blessing position uses zero offsets. Offsets are saved and preserved through later unrelated AI edits and PDF output.
- Raster illustration changes that cannot be rendered independently are explained instead of silently replacing the design. Uploaded artwork size and placement, supported devotional variants, editable colours/fonts/spacing/frames/prints and field organisation remain available.

## Automated evidence

Run `node scripts/run-finishing-tests.mjs` for the permanent contract regression suite. It executes the real TypeScript guard modules with the installed TypeScript compiler; there is no test-mode branch in the production finishing route.

Additional checks performed during implementation:

- 20 synthetic prompt scenarios against the real Groq provider through the production route code, with only authentication isolated: blessing, font, heading colour, photo shape, name size, spacing, label rename, contact/address grouping, image replacement/restoration, uploaded image size/placement, compound font/text, border, print, unsupported image, unsupported compound request, contradictory instructions, protected field values and no-op.
- Initial and repeated exact text replacements through the real route for all 34 built-in templates; original paper gradients and other design properties preserved.
- Browser rendering across all 34 templates: header-only edits preserve other computed styles; explicit font, photo shape, spacing and heading colour render correctly while background artwork remains identical.
- Desktop customer and mobile admin browser journeys: review, discard, changed-prompt invalidation, close during generation, provider error, save failure, retry, apply and reload. No client exceptions in those journeys.
- Authentication and malformed-request boundaries, duplicate/unknown field IDs, forbidden personal values and uploaded-file sources in summaries.
- TypeScript check, focused lint and production build.
- Exact regression prompt to move “Jai Shri RadhaKrishna” slightly downward and right: all three devotional artwork modes at desktop and mobile widths. Review lists only the two offsets; font, colour, content, artwork and other positions remain unchanged. Save/reload and one-page A4 PDF verified, with before/after visual inspection showing the first word clear of the hanging leaves. Real Groq checks cover quantified movement from an existing offset, preservation through a later font edit, and explicit position reset.

Live release verification uses a synthetic customer profile and restores its original content afterward. It checks review without saving, exact blessing apply/save, a real Groq colour edit with manual-palette preservation, reload, download authorisation and the isolated PDF print document.

## Limits

Natural-language interpretation is probabilistic; tests do not establish that every possible prompt will be understood. The fail-closed validator and review step prevent silent broad substitutions. Arbitrary new bitmap generation, editing an embedded illustration, changing personal facts and unrestricted positioning are outside this planner's schema. Users receive an explanation and can use the image upload, field editor or another template instead.

