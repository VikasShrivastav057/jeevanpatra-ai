# Uploaded artwork replacement

Groq continues to handle writing, field creation, editable template design and finishing instructions. The customer-facing artwork flow uses uploaded pictures, without OpenAI or Groq image calls.

In **Finish my biodata**, choose **Replace artwork with an uploaded image**. Upload a JPG, PNG or WebP under 5 MB, select the page area, and adjust the horizontal/vertical crop. **Preview replacement** prepares a full-resolution PNG in the browser and stores it privately with the account. It crops the picture to fill the selected rectangle; transparent areas use an ivory base. It does not synthesize or blend new scenery.

Review the actual biodata, then **Apply artwork & save**. Only the selected background area changes. The profile portrait, fields, text and layout are retained. A storage or save error leaves the current biodata unchanged. Reload and PDF export retain the replacement. **Restore original artwork & save** is also available.

The feature supports the five templates with raster backgrounds: three devotional templates, Pearl Jewel Luxe and Emerald Gold Registry. Other templates retain their existing uploaded-image controls.

Uploaded references and composites are private owner-scoped files. Reference uploads use artwork filenames; completed composite uploads use unique generated filenames for compatibility with saved background replacements. Profile portrait filenames are never overwritten by this flow. Image processing happens in the browser and sends only the final PNG to private application storage.

Paid generation is disabled by default in the API through `ARTWORK_GENERATION_ENABLED`. Its legacy implementation is retained for explicit future operator opt-in, but the current upload interface never calls it. An OpenAI key or API balance is not needed for this flow.

Validation: build and type checks; existing finishing regression suite; image-processing and request-boundary tests; browser customer desktop/admin mobile tests for exact untouched pixels, crop, preview, upload/save failures, retry, reload, restore and A4 PDF export. Legacy image-provider tests explicitly opt into the disabled generation handler using mock external boundaries.
