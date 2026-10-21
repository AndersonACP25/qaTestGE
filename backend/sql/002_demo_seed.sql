-- OPCIONAL: datos ficticios para una importación inicial, no para producción.
-- Ejecutar una sola vez después de 001_schema.sql, conectado a qa_test_ge.
BEGIN;
DO $$
DECLARE
  org_id bigint;
  proj_id bigint;
  case_id bigint;
  bug_id bigint;
  run_id bigint;
  result_id bigint;
  evidence_id bigint;
BEGIN
  INSERT INTO qa.organizations(name) VALUES ('QA Workspace · ejemplo') RETURNING id INTO org_id;
  INSERT INTO qa.projects(organization_id, name) VALUES (org_id, 'Web Store') RETURNING id INTO proj_id;
  INSERT INTO qa.bugs(project_id, title, priority)
    VALUES (proj_id, 'El registro permite enviar campos vacíos', 'Alta') RETURNING id INTO bug_id;
  INSERT INTO qa.test_cases(project_id, title, suite)
    VALUES (proj_id, 'Validar campos obligatorios de registro', 'Registro') RETURNING id INTO case_id;
  INSERT INTO qa.test_case_steps(project_id, test_case_id, position, action, expected_result)
    VALUES (proj_id, case_id, 1, 'Enviar el formulario vacío', 'Se muestran los campos obligatorios y no se crea una cuenta');
  INSERT INTO qa.bug_test_cases(project_id, bug_id, test_case_id) VALUES (proj_id, bug_id, case_id);
  INSERT INTO qa.test_runs(project_id, title, owner)
    VALUES (proj_id, 'Smoke test · ejemplo', 'QA de ejemplo') RETURNING id INTO run_id;
  INSERT INTO qa.test_run_results(project_id, test_run_id, test_case_id, status, steps_snapshot, executed_at)
    SELECT proj_id, run_id, case_id, 'failed',
      jsonb_agg(jsonb_build_object('position', position, 'action', action, 'expected_result', expected_result) ORDER BY position), now()
    FROM qa.test_case_steps WHERE test_case_id = case_id RETURNING id INTO result_id;
  INSERT INTO qa.evidence(project_id, name, type, size_bytes)
    VALUES (proj_id, 'registro-ejemplo.png', 'Imagen', 1024) RETURNING id INTO evidence_id;
  INSERT INTO qa.evidence_links(project_id, evidence_id, test_run_result_id)
    VALUES (proj_id, evidence_id, result_id);
END $$;
COMMIT;
