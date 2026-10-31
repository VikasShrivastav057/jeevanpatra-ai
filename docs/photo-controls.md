# Profile photo controls

In **Your details → Your profile photo**, customers and administrators can upload or drop a JPG/PNG, adjust the crop with drag/zoom/sliders, and enable **Move photo on biodata**. Moving works with mouse, touch or arrow keys. The position toolbar controls frame size and horizontal/vertical placement. Reset position restores the selected template's original frame; reset all also restores its default crop.

The photo stays separate from uploaded artwork and background images. Crop and placement are rendered from the original private image, without rewriting it. Manual placement remains within A4 page bounds and reserves the original layout slot so moving it does not shift other details. Customers choose a position clear of their text; decorative frames embedded in a background illustration remain part of that illustration.

Save the biodata to persist adjustments for reopening and PDF download. Photo-only adjustments to an already completed biodata can be saved as completed without another AI request. Other unfinished edits still follow the existing finishing requirement. Failed/invalid photo replacements preserve the previous image and adjustments.

Stored under `details.photoAdjustment`: `crop {x,y,zoom}` and optional `placement {x,y,width}`. Crop coordinates are percentages in [0,100], zoom is [1,3], frame width is [10,45]% of page width. Placement uses page percentages, constrained for A4. Missing settings preserve legacy styling. The server rejects invalid/nonfinite or out-of-page values. The PDF clones the same crop and placement, with editing highlights removed.

Verification commands:

- `node --experimental-strip-types scripts/test-photo-adjustment.mts`
- `node scripts/test-photo-storage.mjs`

Browser QA covered mouse and touch drag, keyboard movement, crop cancellation/apply/reset, resize, upload/drop, failed and empty replacements, save/reload, completed download without AI and isolated A4 PDF. All 34 built-in templates were checked for no position jump on entering move mode, stable detail layout/background and correct position reset. Live release checks use and restore a synthetic customer profile without overwriting its photo file.

