\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  actor_id text := 'verify:phase1c:actor';
  reviewer_id text := 'verify:phase1c:reviewer';
  club_id text := 'verify:phase1c:club';
  content_id text := 'verify:phase1c:content';
  audit_id text := 'verify:phase1c:audit';
  rejected boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cms' AND table_name = 'content_item'
  ) THEN RAISE EXCEPTION 'CMS schema is missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum enum_value
    JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
    WHERE enum_type.typname = 'cms_media_status'
      AND enum_value.enumlabel = 'failed'
  ) THEN RAISE EXCEPTION 'CMS media failure state is missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cms_media_checksum_format'
  ) THEN RAISE EXCEPTION 'CMS media checksum constraint is missing'; END IF;

  IF (SELECT count(*) FROM identity.role_definition
      WHERE application = 'cms' AND key IN (
        'cms_multimedia_club_supervisor',
        'cms_news_journal_club_supervisor',
        'cms_system_administrator'
      ) AND active) <> 3 THEN
    RAISE EXCEPTION 'Phase 1C system roles are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1 FROM identity.role_definition role,
      jsonb_array_elements_text(role.permissions) permission
    WHERE role.application = 'cms'
      AND permission.value ~ '^(student|staff|attendance|assessment|report|assignment|identity):'
  ) THEN RAISE EXCEPTION 'CMS role contains a S.I.M.S. permission'; END IF;

  INSERT INTO identity."user" (id, name, email, person_reference, status)
  VALUES
    (actor_id, 'Synthetic CMS Author', 'phase1c-author@invalid.example', 'synthetic-phase1c-author', 'active'),
    (reviewer_id, 'Synthetic CMS Reviewer', 'phase1c-reviewer@invalid.example', 'synthetic-phase1c-reviewer', 'active');
  INSERT INTO cms.club (id, key, name, created_by)
  VALUES (club_id, 'phase1c-verification', 'Synthetic Verification Club', actor_id);
  INSERT INTO cms.content_item
    (id, type, title, slug, body, author_user_id, owning_club_id)
  VALUES
    (content_id, 'article', 'Synthetic verification article', 'synthetic-phase1c-verification', 'Synthetic content only.', actor_id, club_id);

  rejected := false;
  BEGIN
    UPDATE cms.content_item
    SET state = 'published', published_at = now(), published_by = reviewer_id
    WHERE id = content_id;
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Draft to published bypass was accepted'; END IF;

  UPDATE cms.content_item SET state = 'submitted', submitted_at = now() WHERE id = content_id;
  UPDATE cms.content_item SET state = 'in_review' WHERE id = content_id;
  rejected := false;
  BEGIN
    UPDATE cms.content_item
    SET reviewed_at = now(), reviewed_by = actor_id
    WHERE id = content_id;
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Self-review was accepted'; END IF;

  UPDATE cms.content_item
  SET reviewed_at = now(), reviewed_by = reviewer_id
  WHERE id = content_id;
  rejected := false;
  BEGIN
    UPDATE cms.content_item
    SET state = 'approved', approved_at = now(), approved_by = actor_id
    WHERE id = content_id;
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Self-approval was accepted'; END IF;

  INSERT INTO cms.editorial_audit_event
    (id, event_type, actor_user_id, resource_type, resource_id, outcome, metadata)
  VALUES
    (audit_id, 'authorization.denied', actor_id, 'content', content_id, 'denied', '{"permission":"content:publish:approved"}');
  rejected := false;
  BEGIN
    UPDATE cms.editorial_audit_event SET reason_code = 'tampered' WHERE id = audit_id;
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Audit mutation was accepted'; END IF;

  IF has_schema_privilege('slgs_web', 'cms', 'USAGE') OR
     has_schema_privilege('slgs_sims', 'cms', 'USAGE') THEN
    RAISE EXCEPTION 'Non-CMS runtime role can use CMS schema';
  END IF;
  IF NOT has_table_privilege('slgs_cms', 'cms.content_item', 'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'CMS runtime role lacks content privileges';
  END IF;
END $$;

ROLLBACK;

\echo 'Phase 1C database verification passed (transaction rolled back).'
