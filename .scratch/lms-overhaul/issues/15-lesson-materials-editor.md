# 15: Lesson materials editor

**What to build:** Every lesson owns a material list supporting images, PDFs, YouTube links, and external links. Materials are added through a modal, carry the right type, and render the same way for students (inline when previewable, new tab otherwise).

**Blocked by:** 14.

**Status:** ready-for-agent

- [ ] A lesson shows its materials with name and type icon.
- [ ] Adding a material is a modal that accepts uploads and links.
- [ ] Uploads use presigned storage; the post-upload CORS failure is fixed.
- [ ] Student view previews embeddable types inline and opens the rest in a new tab.
- [ ] Removing a material asks for confirmation.
