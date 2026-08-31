\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  prefix text := 'phase2b-' || txid_current()::text;
  deletion_rejected boolean := false;
BEGIN
  IF current_user <> 'slgs_sims' THEN
    RAISE EXCEPTION 'Phase 2B verification requires the slgs_sims runtime role';
  END IF;
  IF NOT has_schema_privilege(current_user, 'sims', 'USAGE') THEN
    RAISE EXCEPTION 'S.I.M.S. runtime lacks the sims schema';
  END IF;
  IF NOT has_table_privilege(current_user, 'sims.student', 'SELECT,INSERT,UPDATE') OR
     has_table_privilege(current_user, 'sims.student', 'DELETE') THEN
    RAISE EXCEPTION 'S.I.M.S. student privileges violate least privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_school_administrator'
      AND permissions @> '["student:create:school","staff:update:school","class:read:school","subject:create:school","academic_session:update:school"]'::jsonb
  ) THEN
    RAISE EXCEPTION 'School Administrator Phase 2B role permissions are incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_access_administrator'
      AND permissions ?| ARRAY['student:read:school','staff:read:school','class:read:school','subject:read:school','academic_session:read:school']
  ) THEN
    RAISE EXCEPTION 'Access Administrator inherited Phase 2B record permissions';
  END IF;

  INSERT INTO sims.academic_session (id, name, start_date, end_date)
  VALUES (prefix || '-session', 'Synthetic ' || prefix, '2026-09-01', '2027-07-31');
  INSERT INTO sims.academic_class (id, academic_session_id, code, name)
  VALUES (prefix || '-class', prefix || '-session', 'SYN-1', 'Synthetic Class');
  INSERT INTO sims.subject (id, academic_session_id, code, name)
  VALUES (prefix || '-subject', prefix || '-session', 'SYN', 'Synthetic Subject');
  INSERT INTO sims.student (id, student_number, admission_number, first_name, last_name, class_id)
  VALUES (prefix || '-student', prefix || '-student-number', prefix || '-admission', 'Synthetic', 'Student', prefix || '-class');
  INSERT INTO sims.staff (id, staff_number, first_name, last_name)
  VALUES (prefix || '-staff', prefix || '-staff-number', 'Synthetic', 'Staff');
  UPDATE sims.student SET status = 'archived', updated_at = now() WHERE id = prefix || '-student';
  INSERT INTO identity.security_audit_event
    (id, event_type, application, actor_user_id, target_type, target_id, outcome, reason_code, metadata)
  VALUES
    (prefix || '-audit', 'student.updated', 'sims', NULL, 'student', prefix || '-student', 'success', 'runtime_verification', '{"synthetic":true}');

  IF (SELECT status FROM sims.student WHERE id = prefix || '-student') <> 'archived' THEN
    RAISE EXCEPTION 'S.I.M.S. lifecycle update was not persisted';
  END IF;
  BEGIN
    DELETE FROM sims.student WHERE id = prefix || '-student';
  EXCEPTION WHEN insufficient_privilege THEN
    deletion_rejected := true;
  END;
  IF NOT deletion_rejected THEN
    RAISE EXCEPTION 'S.I.M.S. runtime deletion was not rejected';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'Phase 2B S.I.M.S. runtime verification passed; synthetic transaction rolled back.' AS result;
