import console from "node:console";
import process from "node:process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { URL, pathToFileURL } from "node:url";

const statuses = new Set(["passed", "failed", "timedOut", "skipped", "interrupted"]);

export function collectResults(report, projectName) {
  if (!Array.isArray(report?.suites) || !projectName)
    throw new Error("Indica un proyecto de Playwright y usa un reporte JSON válido.");
  const results = new Map();
  let unmappedCount = 0;
  function visit(suites) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.projectName !== projectName) continue;
          const candidates = [
            ...(test.annotations ?? [])
              .filter((annotation) => annotation.type === "qatestge")
              .map((annotation) => annotation.description),
            ...[...String(spec.title).matchAll(/\[(TC-\d+)\]/g)].map((match) => match[1]),
          ];
          if (!candidates.length) {
            unmappedCount++;
            continue;
          }
          const ids = new Set(
            candidates.map((candidate) => {
              if (!/^TC-\d{1,19}$/.test(candidate ?? ""))
                throw new Error("Hay una anotación qatestge con identificador inválido.");
              const value = BigInt(candidate.slice(3));
              if (value < 1n || value > 9223372036854775807n)
                throw new Error("Hay un identificador de caso fuera de rango.");
              return `TC-${String(value).padStart(3, "0")}`;
            }),
          );
          const [caseId] = ids;
          if (ids.size !== 1 || results.has(caseId))
            throw new Error(
              `Asignación ambigua para ${caseId}. Usa un caso por prueba y proyecto.`,
            );
          const attempts = (test.results ?? []).map((attempt) => attempt.status);
          if (!attempts.length)
            attempts.push(test.expectedStatus === "skipped" ? "skipped" : "interrupted");
          if (attempts.some((status) => !statuses.has(status)))
            throw new Error(`Estado de Playwright desconocido para ${caseId}.`);
          results.set(caseId, { caseId, attempts });
        }
      }
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  if (!results.size)
    throw new Error("El proyecto elegido no tiene pruebas con un ID TC en el reporte.");
  return { results: [...results.values()], unmappedCount };
}

async function main(env, [reportPath, project, suite, environment]) {
  if (!reportPath || !project || !suite || !environment)
    throw new Error("Uso: node publish.mjs <reporte.json> <proyecto Playwright> <suite> <entorno>");
  const {
    QATESTGE_URL,
    QATESTGE_PLAYWRIGHT_TOKEN,
    QATESTGE_RELEASE_VERSION,
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
    GITHUB_RUN_ATTEMPT,
    GITHUB_SHA,
    GITHUB_REF_NAME,
  } = env;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY ?? "") ||
    !/^\d+$/.test(GITHUB_RUN_ID ?? "") ||
    !/^\d+$/.test(GITHUB_RUN_ATTEMPT ?? "") ||
    !/^[a-f0-9]{40}$/.test(GITHUB_SHA ?? "") ||
    !GITHUB_REF_NAME
  )
    throw new Error("Faltan los metadatos de GitHub Actions.");
  if (!/^[a-f0-9]{64}$/.test(QATESTGE_PLAYWRIGHT_TOKEN ?? ""))
    throw new Error("Configura QATESTGE_PLAYWRIGHT_TOKEN como secreto.");
  const base = new URL(QATESTGE_URL ?? "");
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
    throw new Error("QATESTGE_URL debe ser una URL HTTPS sin credenciales.");
  if ((await stat(reportPath)).size > 50 * 1024 * 1024)
    throw new Error("El reporte supera 50 MiB. Publica una suite más pequeña.");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const payload = {
    ...collectResults(report, project),
    ...(QATESTGE_RELEASE_VERSION?.trim()
      ? { releaseVersion: QATESTGE_RELEASE_VERSION.trim() }
      : {}),
    key: `${GITHUB_REPOSITORY}:${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}:${encodeKey(project)}:${encodeKey(suite)}:${encodeKey(environment)}`,
    suite,
    environment,
    commit: GITHUB_SHA,
    branch: GITHUB_REF_NAME,
    runUrl: `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}`,
  };
  const endpoint = new URL(
    "api/integrations/playwright",
    base.href.endsWith("/") ? base : base.href + "/",
  );
  const response = await globalThis.fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QATESTGE_PLAYWRIGHT_TOKEN}`,
    },
    body: JSON.stringify(payload),
    redirect: "error",
    signal: globalThis.AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Publicación rechazada (HTTP ${response.status}).`);
  const { id, unknownCaseIds, unmappedCount } = body.data ?? {};
  if (
    !/^RUN-\d+$/.test(id ?? "") ||
    !Array.isArray(unknownCaseIds) ||
    !unknownCaseIds.every((value) => /^TC-\d+$/.test(value)) ||
    !Number.isSafeInteger(unmappedCount)
  )
    throw new Error("qaTestGE devolvió una confirmación inválida.");
  console.log(
    `Ejecución ${id} publicada. Casos sin vínculo: ${unknownCaseIds.join(", ") || "ninguno"}. Pruebas sin ID: ${unmappedCount}.`,
  );
}

function encodeKey(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main(process.env, process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo publicar el reporte.");
    process.exitCode = 1;
  }
}
