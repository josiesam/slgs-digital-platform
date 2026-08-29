\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  test_run text := 'phase2a-' || txid_current()::text;
  cms_visible integer;
  sims_visible integer;
  update_rejected boolean := false;
  delete_rejected boolean := false;
BEGIN
  SELECT count(*) INTO cms_visible
  FROM identity.security_audit_event
  WHERE application = 'cms';
  IF cms_visible <> 0 THEN
    RAISE EXCEPTION 'S.I.M.S. audit RLS isolation failed';
  END IF;

  INSERT INTO identity.security_audit_event (
    id, event_type, application, target_type, target_id, outcome, reason_code, metadata
  ) VALUES (
    test_run || '-runtime-audit', 'verification.runtime', 'sims', 'verification', test_run, 'success', 'runtime_verification', '{"synthetic":true}'
  );
  SELECT count(*) INTO sims_visible
  FROM identity.security_audit_event
  WHERE id = test_run || '-runtime-audit';
  IF sims_visible <> 1 THEN
    RAISE EXCEPTION 'S.I.M.S. runtime audit INSERT/SELECT failed';
  END IF;

  BEGIN
    UPDATE identity.security_audit_event
    SET reason_code = 'forbidden_update'
    WHERE id = test_run || '-runtime-audit';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    update_rejected := true;
  END;
  IF NOT update_rejected THEN
    RAISE EXCEPTION 'runtime audit UPDATE was not rejected';
  END IF;

  BEGIN
    DELETE FROM identity.security_audit_event
    WHERE id = test_run || '-runtime-audit';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    delete_rejected := true;
  END;
  IF NOT delete_rejected THEN
    RAISE EXCEPTION 'runtime audit DELETE was not rejected';
  END IF;

  IF has_table_privilege('slgs_sims', 'identity.security_audit_event', 'UPDATE')
    OR has_table_privilege('slgs_sims', 'identity.security_audit_event', 'DELETE') THEN
    RAISE EXCEPTION 'slgs_sims retains mutable audit privileges';
  END IF;
  IF NOT has_table_privilege('slgs_sims', 'identity.security_audit_event', 'SELECT')
    OR NOT has_table_privilege('slgs_sims', 'identity.security_audit_event', 'INSERT') THEN
    RAISE EXCEPTION 'slgs_sims lacks required append/read audit privileges';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'Phase 2A runtime isolation verification passed; synthetic transaction rolled back.' AS result;
