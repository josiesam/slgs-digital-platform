# SLGS Technical Constitution

Status: **ACTIVE**

The product consists of an anonymous Public Web and an authenticated CMS. Keep these applications independently deployable and never expose CMS operational or identity data through public routes.

Use TypeScript, React, PostgreSQL with Drizzle, Better Auth for CMS authentication, Zod boundary validation, and server-side default-deny authorization. Keep the Cloudflare R2 CMS bucket private and use server-authorized presigned operations through the provider-neutral storage contract.

Content is moderated through draft, submission, independent review, approval and publication. Club assignments are data-driven and scope-bound; membership never implies broad permissions. Preserve immutable revisions and audit identity, authorization, editorial and media lifecycle mutations.

Never store secrets or real personally identifiable school data in source, fixtures, screenshots or documentation. Public DTOs must not include private filenames, object keys, checksums, users, roles, workflow internals or audit data.
