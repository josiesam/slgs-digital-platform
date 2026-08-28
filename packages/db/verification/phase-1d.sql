\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  author_id text := 'verify:phase1d:author';
  content_type text;
  private_state text;
  view_count integer;
BEGIN
  IF NOT has_schema_privilege('slgs_web', 'public_content', 'USAGE') THEN
    RAISE EXCEPTION 'Web runtime cannot use public content schema';
  END IF;
  IF has_schema_privilege('slgs_web', 'cms', 'USAGE') OR
     has_schema_privilege('slgs_web', 'identity', 'USAGE') OR
     (to_regnamespace('sims') IS NOT NULL AND has_schema_privilege('slgs_web', 'sims', 'USAGE')) THEN
    RAISE EXCEPTION 'Web runtime has a private schema privilege';
  END IF;
  IF NOT has_table_privilege('slgs_web', 'public_content.article', 'SELECT') OR
     has_table_privilege('slgs_web', 'public_content.article', 'INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Web public-content privileges are not read-only';
  END IF;

  INSERT INTO identity."user" (id, name, email, person_reference, status)
  VALUES (author_id, 'Synthetic Public Author', 'phase1d-author@invalid.example', 'synthetic-phase1d-author', 'active');

  FOREACH content_type IN ARRAY ARRAY['page','article','event','announcement','gallery'] LOOP
    INSERT INTO cms.content_item
      (id, type, title, slug, body, author_user_id, state, reviewed_at, reviewed_by,
       approved_at, approved_by, published_at, published_by, event_start_at)
    VALUES
      ('verify:phase1d:' || content_type || ':published', content_type::cms_content_type,
       'Synthetic published ' || content_type, 'synthetic-' || content_type || '-published',
       'Synthetic public body.', author_id, 'published', now(), author_id,
       now(), author_id, now(), author_id,
       CASE WHEN content_type = 'event' THEN now() + interval '1 day' ELSE NULL END);

    FOREACH private_state IN ARRAY ARRAY['draft','submitted','in_review','rejected','approved'] LOOP
      INSERT INTO cms.content_item
        (id, type, title, slug, body, author_user_id, state, event_start_at)
      VALUES
        ('verify:phase1d:' || content_type || ':' || private_state,
         content_type::cms_content_type, 'Synthetic private ' || content_type,
         'synthetic-' || content_type || '-' || replace(private_state, '_', '-'),
         'Must remain private.', author_id, private_state::cms_workflow_state,
         CASE WHEN content_type = 'event' THEN now() + interval '1 day' ELSE NULL END);
    END LOOP;
  END LOOP;

  SELECT count(*) INTO view_count FROM public_content.page WHERE slug LIKE 'synthetic-page-%';
  IF view_count <> 1 THEN RAISE EXCEPTION 'Page projection leaked unpublished content'; END IF;
  SELECT count(*) INTO view_count FROM public_content.article WHERE slug LIKE 'synthetic-article-%';
  IF view_count <> 1 THEN RAISE EXCEPTION 'Article projection leaked unpublished content'; END IF;
  SELECT count(*) INTO view_count FROM public_content.event WHERE slug LIKE 'synthetic-event-%';
  IF view_count <> 1 THEN RAISE EXCEPTION 'Event projection leaked unpublished content'; END IF;
  SELECT count(*) INTO view_count FROM public_content.announcement WHERE slug LIKE 'synthetic-announcement-%';
  IF view_count <> 1 THEN RAISE EXCEPTION 'Announcement projection leaked unpublished content'; END IF;
  SELECT count(*) INTO view_count FROM public_content.gallery WHERE slug LIKE 'synthetic-gallery-%';
  IF view_count <> 1 THEN RAISE EXCEPTION 'Gallery projection leaked unpublished content'; END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public_content'
      AND column_name IN ('state','author_user_id','reviewed_by','approved_by','published_by','featured_media_id','storage_key')
  ) THEN RAISE EXCEPTION 'Public projection exposes private metadata'; END IF;
END $$;

ROLLBACK;

\echo 'Phase 1D public boundary verification passed (transaction rolled back).'
