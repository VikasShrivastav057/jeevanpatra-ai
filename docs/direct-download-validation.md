# Direct biodata downloads

Implemented 31 October 2026.

- AI finishing is optional. A manual save marks the current preview as completed, with its completion signature.
- The editor offers Save & download PDF for new or changed content and Download PDF for the completed, saved version, at both the top and end of the editor.
- Save & download saves first, checks authenticated download permission, and uses the existing isolated PDF print document. It does not call AI, open the finishing dialog, or change the preview.
- Empty names, upload-in-progress, failed saves and unauthorised downloads do not print. Edits made during saving or the download permission check require a fresh save/download.
- The server still requires an authenticated account and a completed saved profile, and records download activity for both customer and administrator accounts.

Verification: desktop customer and mobile administrator browser journeys covered draft save/download, completed download without resaving, saved completion after reload, manual save without AI, empty name, failed persistence and retry, concurrent edits, disabled pending actions and zero AI calls. The printed document is produced by the existing PDF pipeline. TypeScript, focused lint and the production build passed.
