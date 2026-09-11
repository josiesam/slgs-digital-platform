-- Align the system-managed CMS Administrator with the stakeholder-approved
-- complete CMS administration contract. Authorization remains permission based.
UPDATE "identity"."role_definition"
SET
  "permissions" = '["media:create:own","media:read:cms","media:update:cms","media:archive:cms","content:create:own","content:read:cms","content:update:cms","content:submit:cms","page:create:own","page:update:own","page:submit:own","article:create:own","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own","gallery:create:own","gallery:update:own","gallery:submit:own","content:review:cms","content:reject:cms","content:approve:cms","content:read:approved","content:publish:cms","content:unpublish:cms","membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","club:manage:cms","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms","user:read:cms","user:create:cms","user:update:cms","user:deactivate:cms","session:revoke:cms"]'::jsonb,
  "scope_dimensions" = '[]'::jsonb,
  "updated_at" = now()
WHERE
  "application" = 'cms'
  AND "key" = 'cms_administrator'
  AND "system_managed";
