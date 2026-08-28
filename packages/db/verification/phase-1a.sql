\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  test_run text := 'phase1a-' || txid_current()::text;
  cms_role_id text := test_run || '-cms-role';
  sims_role_id text;
  cms_membership_id text := test_run || '-cms-membership';
  sims_membership_id text := test_run || '-sims-membership';
  boundary_rejected boolean := false;
  sixth_rejected boolean := false;
  remaining_sessions integer;
  active_administrators integer;
  available_administrator_slots integer;
BEGIN
  FOR position IN 1..8 LOOP
    INSERT INTO identity."user" (
      id, name, email, email_verified, person_reference, status
    ) VALUES (
      test_run || '-user-' || position,
      'Synthetic Verification Identity ' || position,
      test_run || '-' || position || '@example.invalid',
      true,
      test_run || '-person-' || position,
      'active'
    );
  END LOOP;

  INSERT INTO identity.role_definition (
    id, application, key, name, description, permissions
  ) VALUES
    (cms_role_id, 'cms', test_run || '-cms', 'Synthetic CMS Role', 'Migration verification only', '[]');

  SELECT id INTO sims_role_id
  FROM identity.role_definition
  WHERE application = 'sims' AND key = 'sims_system_administrator' AND active;

  SELECT 5 - count(DISTINCT membership.user_id)
  INTO available_administrator_slots
  FROM identity.role_assignment assignment
  JOIN identity.role_definition role ON role.id = assignment.role_definition_id
  JOIN identity.application_membership membership ON membership.id = assignment.membership_id
  JOIN identity."user" identity_user ON identity_user.id = membership.user_id
  WHERE role.application = 'sims'
    AND role.key = 'sims_system_administrator'
    AND role.active
    AND membership.status = 'active'
    AND identity_user.status = 'active'
    AND assignment.revoked_at IS NULL;

  IF available_administrator_slots < 1 THEN
    RAISE EXCEPTION 'verification requires at least one available System Administrator slot';
  END IF;

  INSERT INTO identity.application_membership (
    id, user_id, application, status, approved_at
  ) VALUES
    (cms_membership_id, test_run || '-user-1', 'cms', 'active', now()),
    (sims_membership_id, test_run || '-user-2', 'sims', 'active', now());

  BEGIN
    INSERT INTO identity.role_assignment (
      id, membership_id, role_definition_id, assigned_by
    ) VALUES (
      test_run || '-invalid-boundary', sims_membership_id, cms_role_id, test_run || '-user-1'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%role application must match membership application%' THEN
      boundary_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT boundary_rejected THEN
    RAISE EXCEPTION 'application-boundary trigger did not reject mismatched role';
  END IF;

  FOR position IN 1..(available_administrator_slots + 1) LOOP
    INSERT INTO identity.application_membership (
      id, user_id, application, status, approved_at
    ) VALUES (
      test_run || '-admin-membership-' || position,
      test_run || '-user-' || (position + 2),
      'sims',
      'active',
      now()
    );
  END LOOP;

  FOR position IN 1..available_administrator_slots LOOP
    INSERT INTO identity.role_assignment (
      id, membership_id, role_definition_id, assigned_by
    ) VALUES (
      test_run || '-admin-assignment-' || position,
      test_run || '-admin-membership-' || position,
      sims_role_id,
      test_run || '-user-1'
    );
  END LOOP;

  BEGIN
    INSERT INTO identity.role_assignment (
      id, membership_id, role_definition_id, assigned_by
    ) VALUES (
      test_run || '-admin-assignment-over-limit',
      test_run || '-admin-membership-' || (available_administrator_slots + 1),
      sims_role_id,
      test_run || '-user-1'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%at most five active S.I.M.S. System Administrators%' THEN
      sixth_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT sixth_rejected THEN
    RAISE EXCEPTION 'sixth active S.I.M.S. System Administrator was not rejected';
  END IF;

  UPDATE identity.role_assignment
  SET revoked_at = now(), revoked_by = test_run || '-user-1'
  WHERE id = test_run || '-admin-assignment-1';

  INSERT INTO identity.role_assignment (
    id, membership_id, role_definition_id, assigned_by
  ) VALUES (
    test_run || '-admin-assignment-replacement',
    test_run || '-admin-membership-' || (available_administrator_slots + 1),
    sims_role_id,
    test_run || '-user-1'
  );

  SELECT count(DISTINCT membership.user_id)
  INTO active_administrators
  FROM identity.role_assignment assignment
  JOIN identity.role_definition role ON role.id = assignment.role_definition_id
  JOIN identity.application_membership membership ON membership.id = assignment.membership_id
  JOIN identity."user" identity_user ON identity_user.id = membership.user_id
  WHERE role.application = 'sims'
    AND role.key = 'sims_system_administrator'
    AND role.active
    AND membership.status = 'active'
    AND identity_user.status = 'active'
    AND assignment.revoked_at IS NULL;
  IF active_administrators <> 5 THEN
    RAISE EXCEPTION 'expected five active System Administrators, got %', active_administrators;
  END IF;

  INSERT INTO identity.session (
    id, expires_at, token, user_id
  ) VALUES (
    test_run || '-session', now() + interval '1 hour', test_run || '-session-token', test_run || '-user-2'
  );
  UPDATE identity."user" SET status = 'suspended' WHERE id = test_run || '-user-2';
  SELECT count(*) INTO remaining_sessions FROM identity.session WHERE id = test_run || '-session';
  IF remaining_sessions <> 0 THEN
    RAISE EXCEPTION 'suspension did not revoke the synthetic session';
  END IF;

  INSERT INTO identity.security_audit_event (
    id, event_type, application, actor_user_id, target_type, target_id, outcome, reason_code, metadata
  ) VALUES (
    test_run || '-audit', 'identity.suspended', 'sims', test_run || '-user-1', 'identity', test_run || '-user-2', 'success', 'integration_verification', '{"synthetic":true}'
  );

  IF EXISTS (
    SELECT 1 FROM identity.security_audit_event
    WHERE id = test_run || '-audit'
      AND metadata::text ~* '(password|secret|token|backup.?code|session.?cookie|mfa.?key)'
  ) THEN
    RAISE EXCEPTION 'audit metadata contains a forbidden secret field';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'Phase 1A database verification passed; synthetic transaction rolled back.' AS result;
