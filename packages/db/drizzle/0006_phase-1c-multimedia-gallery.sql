UPDATE "identity"."role_definition"
SET permissions = '["media:create:own","media:read:club","media:update:own","media:archive:own","gallery:create:own","gallery:update:own","gallery:submit:own","content:create:own","content:read:club","content:update:own","content:submit:own"]'::jsonb,
    updated_at = now()
WHERE application = 'cms' AND key = 'cms_multimedia_club';
