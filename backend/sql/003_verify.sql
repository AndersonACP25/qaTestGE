-- Verificación manual para PostgreSQL, no forma parte de pnpm test.
-- Ejecutar tras 001_schema.sql. Todo el contenido de prueba se revierte.
BEGIN;
DO $$
DECLARE
  org bigint;
  project_a bigint;
  project_b bigint;
  case_a bigint;
  case_b bigint;
  run_a bigint;
  evidence_a bigint;
BEGIN
  INSERT INTO qa.organizations(name) VALUES ('Verificación temporal') RETURNING id INTO org;
  INSERT INTO qa.projects(organization_id, name) VALUES (org, 'A') RETURNING id INTO project_a;
  INSERT INTO qa.projects(organization_id, name) VALUES (org, 'B') RETURNING id INTO project_b;
  INSERT INTO qa.test_cases(project_id, title, suite) VALUES (project_a, 'Caso A', 'Smoke') RETURNING id INTO case_a;
  INSERT INTO qa.test_cases(project_id, title, suite) VALUES (project_b, 'Caso B', 'Smoke') RETURNING id INTO case_b;
  INSERT INTO qa.test_case_steps(project_id, test_case_id, position, action, expected_result)
    VALUES (project_a, case_a, 1, 'Acción', 'Resultado');
  INSERT INTO qa.test_runs(project_id, title, owner) VALUES (project_a, 'Run A', 'QA') RETURNING id INTO run_a;
  INSERT INTO qa.test_run_results(project_id, test_run_id, test_case_id, steps_snapshot)
    VALUES (project_a, run_a, case_a, '[]');

  BEGIN
    INSERT INTO qa.test_run_results(project_id, test_run_id, test_case_id, steps_snapshot)
      VALUES (project_a, run_a, case_b, '[]');
    RAISE EXCEPTION 'Fallo: se permitió un caso de otro proyecto';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO qa.test_case_steps(project_id, test_case_id, position, action, expected_result)
      VALUES (project_a, case_a, 1, 'Duplicado', 'Resultado');
    RAISE EXCEPTION 'Fallo: se permitió duplicar la posición de un paso';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO qa.bugs(project_id, title, priority) VALUES (project_a, 'Bug', 'Urgente');
    RAISE EXCEPTION 'Fallo: se permitió una prioridad inválida';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO qa.evidence(project_id, name, type, size_bytes)
    VALUES (project_a, 'ejemplo.png', 'Imagen', 0) RETURNING id INTO evidence_a;
  INSERT INTO qa.evidence_links(project_id, evidence_id, test_case_id)
    VALUES (project_a, evidence_a, case_a);
  BEGIN
    INSERT INTO qa.evidence_links(project_id, evidence_id, test_case_id)
      VALUES (project_a, evidence_a, case_b);
    RAISE EXCEPTION 'Fallo: se permitió evidencia entre proyectos';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO qa.evidence_links(project_id, evidence_id, test_case_id, test_run_id)
      VALUES (project_a, evidence_a, case_a, run_a);
    RAISE EXCEPTION 'Fallo: se permitieron dos destinos en un vínculo';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'Verificación correcta: relaciones, límites de proyecto y restricciones';
END $$;
ROLLBACK;
-- Las secuencias identity pueden avanzar aunque se reviertan las filas.
