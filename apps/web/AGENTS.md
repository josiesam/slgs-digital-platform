# Public Website Agent Instructions

Scope: `apps/web/**`

This application is the public SLGS website.

## Rules

- Treat all CMS content as untrusted input.
- Only expose content whose publication state is `published` and whose publication window permits display.
- Never import or expose S.I.M.S. domain data.
- Do not put CMS administrative controls into this application.
- Optimize for mobile-first performance, accessibility, SEO, structured metadata, and stable URLs.
- Use semantic HTML and keyboard-accessible interactions.
- Images must have appropriate alt text unless genuinely decorative.
- Do not hard-code news, events, galleries, or announcements that belong in CMS data.
- Public pages may cache published content, but unpublished content must never leak through cached responses.
