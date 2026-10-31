import { ProjectPermissionsProvider } from "./controllers/ProjectPermissions";
import { can } from "../backend/src/models/collaboration.model";
import MentionsView from "./views/MentionsView";
import CollaborationPanel from "./views/CollaborationPanel";
import DashboardView from "./views/DashboardView";
import CoverageView from "./views/CoverageView";
import "./views/analytics.css";
import ImportPanel from "./views/ImportPanel";
import CaseHistoryPanel from "./views/CaseHistoryPanel";
import TestPlansView from "./views/TestPlansView";
import { useBugWorkflow } from "./controllers/useBugWorkflow";
import { useProjectData } from "./controllers/useProjectData";
import TableFooter from "./components/TableFooter";
import { Icon, Avatar } from "./components/RecordPrimitives";
import { BugTable, CaseTable, RunTable, EvidenceTable } from "./views/WorkspaceTables";
import CaseAttachmentsPanel from "./views/CaseAttachmentsPanel";
import { useCasePreferences } from "./controllers/useCasePreferences";
import { useOperationScope } from "./controllers/useOperationScope";
import TagPicker from "./TagPicker";
import BugDesignView from "./views/BugDesignView";
import TableExport from "./TableExport";
import { bugTableExport, caseTableExport, runTableExport } from "./models/tableExport";
import TestRunDialog from "./views/TestRunDialog";
import { version } from "../package.json";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Alert, { type AlertTone } from "./Alert";
import Footer from "./Footer";
import { filterBugs, filterCases, filterEvidence, filterRuns } from "./utils/filterItems";
import CaseBuilder from "./CaseBuilder";
import Dialog from "./Dialog";
import {
  addTestCaseLink,
  api,
  loadProject,
  createBug,
  createTestCase,
  deleteBug,
  listTags,
  deleteEvidence,
  downloadEvidenceFile,
  deleteTestCase,
  saveBugStatus,
  saveCaseStatus,
  updateBug,
  updateEvidence,
  updateTestCase,
  uploadEvidenceFile,
  uploadTestCaseImage,
} from "./api";
import type { BugTemplate, BugTemplatePriority, Project, User } from "./api";
import AccountSettingsView from "./views/AccountSettingsView";
import WikiView from "./views/WikiView";
import TagsView from "./views/TagsView";
import ReportsView from "./views/ReportsView";
import RecordDetailsDialog, { type RecordDetail } from "./views/RecordDetailsDialog";
import { exportRecord, recordExportFormats } from "./utils/exportRecord";
import type { ExportFormat, ExportRecord } from "./utils/exportRecord";
import type { CreateTestCaseInput } from "../backend/src/models/test-case.model";
import type {
  Bug,
  Evidence,
  NavigationPage,
  IconName,
  BugStatus,
  CaseStatus,
  TestCase,
  TestRun,
  Tag,
} from "./types";
import { bugStatuses, caseStatuses } from "./types";

const navigation: {
  section: string;
  items: { id: NavigationPage; label: string; icon: IconName; count?: string }[];
}[] = [
  {
    section: "WORKSPACE",
    items: [
      { id: "overview", label: "Dashboard", icon: "grid" },
      { id: "mentions", label: "Mis menciones", icon: "bell" },
      { id: "coverage", label: "Cobertura y requisitos", icon: "check-square" },
      { id: "reports", label: "Reportes y métricas", icon: "chart" },
      { id: "bugs", label: "Bugs", icon: "bug", count: undefined },
      { id: "cases", label: "Casos de prueba", icon: "check-square" },
      { id: "bug-builder", label: "Diseñar bugs", icon: "sparkle" },
      { id: "case-builder", label: "Diseñar test cases", icon: "sparkle" },
      { id: "plans", label: "Planes y ciclos", icon: "calendar" },
      { id: "runs", label: "Test runs", icon: "play" },
      { id: "evidence", label: "Evidencias", icon: "image" },
      { id: "tags", label: "Tags", icon: "tag" },
      { id: "wiki", label: "Wiki", icon: "file" },
    ],
  },
  { section: "CUENTA", items: [{ id: "settings", label: "Configuración", icon: "settings" }] },
];

function isTestCaseRecord(value: object): value is TestCase {
  return "steps" in value && "suite" in value && "id" in value;
}

function App({
  user,
  onUserUpdated,
  onAccountDeleted,
  onLogout,
  themeControl,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
  onLogout: () => void;
  themeControl: React.ReactNode;
}) {
  const [activePage, setActivePage] = useState<NavigationPage>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const captureScope = useOperationScope(user.id, projectId);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagError, setTagError] = useState("");
  const [revision, setRevision] = useState(0);
  const [projectError, setError] = useState("");
  const {
    data,
    setData,
    loading,
    error: resourceError,
    setLoading,
  } = useProjectData(
    projectId,
    revision,
    !["overview", "reports", "coverage", "settings"].includes(activePage),
  );
  const error = projectError || resourceError;
  const { workflow, error: workflowError } = useBugWorkflow(projectId, revision);
  const projectBugStatuses = workflow?.states ?? bugStatuses;
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [lifecycleFilter, setLifecycleFilter] = useState("Todos");
  const creationKey = useRef(crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");
  const {
    preferences,
    save: savePreferences,
    error: preferencesError,
  } = useCasePreferences(user.id);
  const {
    catalog: caseCatalog,
    counts: caseCountDefaults,
    selected: caseDesignCategories,
  } = preferences;
  const [modal, setModal] = useState("");
  const [bugTemplates, setBugTemplates] = useState<BugTemplate[]>([]);
  const [bugTemplatesLoading, setBugTemplatesLoading] = useState(false);
  const [bugTemplatesError, setBugTemplatesError] = useState("");
  const [selectedBugTemplateId, setSelectedBugTemplateId] = useState("");
  const [bugForm, setBugForm] = useState<{
    title: string;
    description: string;
    priority: BugTemplatePriority;
    status: BugStatus;
    assignee: string;
  }>({ title: "", description: "", priority: "Media", status: "Abierto", assignee: "" });
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [deleteBugTarget, setDeleteBugTarget] = useState<Bug | null>(null);
  const [deleteBugError, setDeleteBugError] = useState("");
  const [deleteBugBusy, setDeleteBugBusy] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [evidenceActionTarget, setEvidenceActionTarget] = useState<Evidence | null>(null);
  const [evidenceToDelete, setEvidenceToDelete] = useState<Evidence | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({
    name: "",
    type: "Archivo" as Evidence["type"],
    sizeBytes: 0,
    related: "",
  });
  const [evidenceRelatedChanged, setEvidenceRelatedChanged] = useState(false);
  const [caseSteps, setCaseSteps] = useState([{ action: "", expectedResult: "" }]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [teamMemberError, setTeamMemberError] = useState("");
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [caseImageFiles, setCaseImageFiles] = useState<File[]>([]);
  const [caseImageDragging, setCaseImageDragging] = useState(false);
  const [exportTarget, setExportTarget] = useState<ExportRecord | null>(null);
  const [deleteCaseTarget, setDeleteCaseTarget] = useState<TestCase | null>(null);
  const [deleteCaseError, setDeleteCaseError] = useState("");
  const [deleteCaseBusy, setDeleteCaseBusy] = useState(false);
  const [exportingRecord, setExportingRecord] = useState(false);
  const [formError, setFormError] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<AlertTone>("success");
  const [runDetail, setRunDetail] = useState<TestRun | null>(null);
  const [runAction, setRunAction] = useState<"view" | "edit" | "delete" | "execute">("view");
  const [detail, setDetail] = useState<object | null>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDetail | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const project = projects.find((p) => p.id === projectId);
  const role = project?.role ?? "Solo lectura";
  const allowed = (permission: Parameters<typeof can>[1]) => can(role, permission);
  useEffect(() => {
    if (!project?.organizationId) {
      setTeamMembers([]);
      return;
    }
    const abort = new AbortController();
    setTeamMembers([]);
    setTeamMemberError("");
    void api<{ id: string; name: string }[]>(
      `/project-members?projectId=${encodeURIComponent(project.id)}`,
      { signal: abort.signal },
    )
      .then(setTeamMembers)
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setTeamMemberError(
            cause instanceof Error ? cause.message : "No se pudieron cargar los integrantes.",
          );
      });
    return () => abort.abort();
  }, [project?.organizationId, project?.id]);
  const { bugs, cases, runs, evidence } = data;
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const abort = new AbortController();
    void api<Project[]>("/projects", { signal: abort.signal })
      .then((items) => {
        if (abort.signal.aborted) return;
        setError("");
        setProjects(items);
        setProjectId((current) =>
          items.some((p) => p.id === current) ? current : (items[0]?.id ?? ""),
        );
        if (!items.length) setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los proyectos.");
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [revision, setError, setLoading]);
  useEffect(() => {
    if (modal !== "bug") return;
    const abort = new AbortController();
    setBugTemplatesLoading(true);
    setBugTemplatesError("");
    void api<BugTemplate[]>("/auth/bug-templates", { signal: abort.signal })
      .then((items) => {
        if (!abort.signal.aborted) setBugTemplates(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setBugTemplatesError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las plantillas.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setBugTemplatesLoading(false);
      });
    return () => abort.abort();
  }, [modal]);
  useEffect(() => {
    if (!projectId) {
      setTags([]);
      return;
    }
    const abort = new AbortController();
    setTagError("");
    void listTags(projectId)
      .then((items) => {
        if (!abort.signal.aborted) setTags(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setTags([]);
          setTagError(cause instanceof Error ? cause.message : "No se pudieron cargar los tags.");
        }
      });
    return () => abort.abort();
  }, [projectId, revision]);
  const filteredBugs = useMemo(
    () => filterBugs(bugs, { search, statusFilter }),
    [bugs, search, statusFilter],
  );
  const filteredCases = useMemo(
    () =>
      filterCases(cases, { search, statusFilter }).filter(
        (c) =>
          (typeFilter === "Todos" || (c.testType ?? "Funcional") === typeFilter) &&
          (lifecycleFilter === "Todos" || (c.lifecycle ?? "Borrador") === lifecycleFilter),
      ),
    [cases, search, statusFilter, typeFilter, lifecycleFilter],
  );
  const filteredRuns = useMemo(
    () => filterRuns(runs, { search, statusFilter }),
    [runs, search, statusFilter],
  );
  const filteredEvidence = useMemo(() => filterEvidence(evidence, { search }), [evidence, search]);
  const matchedTotal =
    activePage === "bugs"
      ? filteredBugs.length
      : activePage === "cases"
        ? filteredCases.length
        : activePage === "runs"
          ? filteredRuns.length
          : filteredEvidence.length;
  const currentTablePage = Math.min(tablePage, Math.max(1, Math.ceil(matchedTotal / 50)));
  const slicePage = <T,>(items: T[]) =>
    items.slice((currentTablePage - 1) * 50, currentTablePage * 50);
  const visibleBugs = slicePage(filteredBugs),
    visibleCases = slicePage(filteredCases),
    visibleRuns = slicePage(filteredRuns),
    visibleEvidence = slicePage(filteredEvidence);
  const pageTitle = {
    mentions: "Mis menciones",
    coverage: "Cobertura y requisitos",
    overview: "Dashboard",
    plans: "Planes y ciclos",
    reports: "Reportes y métricas",
    bugs: "Bugs",
    cases: "Casos de prueba",
    runs: "Test runs",
    evidence: "Evidencias",
    tags: "Tags",
    settings: "Configuración",
    wiki: "Wiki",
    "bug-builder": "Diseñar bugs",
    "case-builder": "Diseñar test cases",
  }[activePage];
  const notify = (message: string, tone: AlertTone = "success") => {
    clearTimeout(toastTimer.current);
    setToastTone(tone);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };
  function navigate(page: NavigationPage) {
    setActivePage(page);
    setTablePage(1);
    setSearch("");
    setStatusFilter("Todos");
    setMobileNav(false);
  }
  function openModal(value: string) {
    creationKey.current = crypto.randomUUID();
    setFormError("");
    setAssigneeUserId("");
    setEditingBug(null);
    setEditingEvidence(null);
    setEditingCase(null);
    setCaseImageFiles([]);
    setCaseImageDragging(false);
    if (value === "bug") {
      setBugForm({
        title: "",
        description: "",
        priority: "Media",
        status: "Abierto",
        assignee: "",
      });
      setSelectedBugTemplateId("");
    }
    if (value === "case") setCaseSteps([{ action: "", expectedResult: "" }]);
    setSelectedTagIds([]);
    if (value === "evidence") {
      setEvidenceForm({ name: "", type: "Archivo", sizeBytes: 0, related: "" });
      setEvidenceRelatedChanged(false);
    }
    setModal(value);
  }
  function editBug(bug: Bug) {
    setAssigneeUserId(bug.assigneeUserId ?? "");
    setBugForm({
      title: bug.title,
      description: bug.description ?? "",
      priority: bug.priority,
      status: bug.status,
      assignee: bug.assigneeUserId || bug.assignee === "—" ? "" : bug.assignee,
    });
    setEditingBug(bug);
    setSelectedTagIds(bug.tagIds ?? []);
    setSelectedBugTemplateId("");
    setRecordDetail(null);
    setFormError("");
    setModal("edit-bug");
  }
  function editEvidence(evidenceRecord: Evidence) {
    setEditingEvidence(evidenceRecord);
    setEvidenceForm({
      name: evidenceRecord.name,
      type: evidenceRecord.type,
      sizeBytes: evidenceRecord.sizeBytes,
      related:
        evidenceRecord.related === "Sin vincular" ? "" : evidenceRecord.related.split(", ")[0],
    });
    setEvidenceRelatedChanged(false);
    setEvidenceActionTarget(null);
    setFormError("");
    setModal("edit-evidence");
  }
  async function removeEvidence() {
    if (!evidenceToDelete || saving) return;
    setSaving(true);
    setFormError("");
    const isCurrent = captureScope();
    try {
      await deleteEvidence(evidenceToDelete.id, projectId);
      if (!isCurrent()) return;
      setEvidenceToDelete(null);
      setRevision((current) => current + 1);
      notify("Evidencia eliminada.");
    } catch (cause) {
      if (!isCurrent()) return;
      setFormError(cause instanceof Error ? cause.message : "No se pudo eliminar la evidencia.");
    } finally {
      if (isCurrent()) setSaving(false);
    }
  }
  async function downloadEvidence(item: Evidence) {
    try {
      await downloadEvidenceFile(item.id, item.projectId, item.name);
      notify(`Descargando ${item.name}.`);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "No se pudo descargar el archivo.", "error");
    }
  }
  function editCase(testCase: TestCase) {
    setAssigneeUserId(testCase.assigneeUserId ?? "");
    setRecordDetail(null);
    setFormError("");
    setCaseImageFiles([]);
    setEditingCase(testCase);
    setSelectedTagIds(testCase.tagIds ?? []);
    setCaseSteps(
      testCase.steps?.length
        ? testCase.steps.map((step) => ({
            action: step.action,
            expectedResult: step.expectedResult,
          }))
        : [{ action: "", expectedResult: "" }],
    );
    setExportTarget(null);
    setModal("edit-case");
  }
  function addCaseImages(files: FileList | File[]) {
    const selected = Array.from(files);
    if (
      selected.some(
        (file) =>
          !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type) ||
          file.size === 0 ||
          file.size > 2 * 1024 * 1024,
      )
    ) {
      setFormError("Solo se admiten imágenes PNG, JPEG, GIF o WebP de hasta 2 MB cada una.");
      return;
    }
    const merged = [
      ...caseImageFiles,
      ...selected.filter(
        (file) =>
          !caseImageFiles.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          ),
      ),
    ];
    if (merged.length > 5) {
      setFormError("Puedes adjuntar hasta 5 imágenes por operación.");
      return;
    }
    setFormError("");
    setCaseImageFiles(merged);
  }
  function applyBugTemplate(templateId: string) {
    setSelectedBugTemplateId(templateId);
    const template = bugTemplates.find((item) => item.id === templateId);
    setBugForm(
      template
        ? {
            title: template.title,
            description: template.description,
            priority: template.priority,
            status: "Abierto",
            assignee: "",
          }
        : { title: "", description: "", priority: "Media", status: "Abierto", assignee: "" },
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || saving) return;
    const isCurrent = captureScope();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (modal === "edit-bug") {
      if (!editingBug) return;
      setSaving(true);
      setFormError("");
      try {
        await updateBug(editingBug.id, projectId, {
          title,
          description: bugForm.description,
          priority: bugForm.priority,
          severity: String(form.get("severity") ?? "Media") as Bug["priority"],
          environment: String(form.get("environment") ?? ""),
          affectedVersion: String(form.get("affectedVersion") ?? ""),
          status: bugForm.status,
          assignee: bugForm.assignee.trim() || null,
          assigneeUserId: assigneeUserId || null,
          tagIds: selectedTagIds,
        });
        if (!isCurrent()) return;
        setModal("");
        setEditingBug(null);
        setRevision((current) => current + 1);
        setActivePage("bugs");
        notify("Bug actualizado.");
      } catch (cause) {
        if (!isCurrent()) return;
        setFormError(cause instanceof Error ? cause.message : "No se pudo actualizar el bug.");
      } finally {
        if (isCurrent()) setSaving(false);
      }
      return;
    }
    if (modal === "upload-evidence") {
      if (!editingEvidence) return;
      const file = form.get("file");
      if (!(file instanceof File) || !file.name || file.size < 1 || file.size > 2 * 1024 * 1024) {
        setFormError("Selecciona un archivo válido de hasta 2 MiB.");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        await uploadEvidenceFile(editingEvidence.id, projectId, file);
        if (!isCurrent()) return;
        setModal("");
        setEditingEvidence(null);
        setRevision((current) => current + 1);
        setActivePage("evidence");
        notify("Archivo de evidencia guardado.");
      } catch (cause) {
        if (!isCurrent()) return;
        setFormError(cause instanceof Error ? cause.message : "No se pudo subir el archivo.");
      } finally {
        if (isCurrent()) setSaving(false);
      }
      return;
    }
    if (modal === "edit-evidence") {
      if (!editingEvidence) return;
      if (!Number.isSafeInteger(evidenceForm.sizeBytes) || evidenceForm.sizeBytes < 0) {
        setFormError("El tamaño debe ser un número entero no negativo.");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        await updateEvidence(editingEvidence.id, projectId, {
          name: evidenceForm.name.trim(),
          type: evidenceForm.type,
          sizeBytes: evidenceForm.sizeBytes,
          ...(evidenceRelatedChanged ? { related: evidenceForm.related || null } : {}),
        });
        if (!isCurrent()) return;
        setModal("");
        setEditingEvidence(null);
        setRevision((current) => current + 1);
        setActivePage("evidence");
        notify("Metadatos de evidencia actualizados.");
      } catch (cause) {
        if (!isCurrent()) return;
        setFormError(
          cause instanceof Error ? cause.message : "No se pudieron actualizar los metadatos.",
        );
      } finally {
        if (isCurrent()) setSaving(false);
      }
      return;
    }
    let path = "/bugs";
    let body: Record<string, unknown> = {
      projectId,
      title,
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "Media"),
    };
    let caseInput: Omit<CreateTestCaseInput, "projectId"> | null = null;
    if (modal === "case" || modal === "edit-case") {
      path = "/test-cases";
      const steps = caseSteps.map((step) => ({
        action: step.action.trim(),
        expectedResult: step.expectedResult.trim(),
      }));
      if (steps.some((step) => Boolean(step.action) !== Boolean(step.expectedResult))) {
        setFormError(
          "Completa la acción y el resultado esperado en cada paso, o deja ambos vacíos.",
        );
        return;
      }
      caseInput = {
        title,
        suite: String(form.get("suite") ?? "").trim() || undefined,
        testType: String(form.get("testType") ?? "Funcional"),
        lifecycle: String(form.get("lifecycle") ?? "Borrador") as "Borrador" | "Listo" | "Obsoleto",
        expectedVersion: editingCase?.version,
        preconditions: String(form.get("preconditions") ?? ""),
        steps: steps.filter((step) => step.action && step.expectedResult),
        tagIds: selectedTagIds,
        assigneeUserId: assigneeUserId || null,
      };
      body = { projectId, ...caseInput };
    } else if (modal === "run") {
      path = "/test-runs";
      body = {
        projectId,
        title,
        owner: user.name,
        caseIds: form.getAll("caseIds"),
        tagIds: selectedTagIds,
      };
    } else if (modal === "evidence") {
      path = "/evidence";
      const file = form.get("file");
      if (!(file instanceof File) || !file.name || file.size < 1 || file.size > 2 * 1024 * 1024) {
        setFormError("Selecciona un archivo válido de hasta 2 MiB.");
        return;
      }
      body = {
        projectId,
        related: String(form.get("related") ?? "") || null,
      };
    }
    setSaving(true);
    setFormError("");
    try {
      if (modal === "case" || modal === "edit-case") {
        if (!caseInput) throw new Error("No se pudo preparar el caso de prueba.");
        const savedCase =
          modal === "edit-case" && editingCase
            ? await updateTestCase(editingCase.id, projectId, caseInput)
            : await createTestCase({ ...caseInput, projectId }, creationKey.current);
        if (!isCurrent()) return;
        if (!isCurrent()) return;
        const links = String(form.get("attachmentLinks") ?? "")
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean);
        try {
          for (const file of caseImageFiles)
            await uploadTestCaseImage(savedCase.id, projectId, file);
          if (!isCurrent()) return;
          for (const link of links) {
            let name = link;
            try {
              name = new URL(link).hostname;
            } catch {
              /* The API reports malformed URLs. */
            }
            await addTestCaseLink(savedCase.id, projectId, name, link);
          }
        } catch (cause) {
          if (!isCurrent()) return;
          setModal("");
          setEditingCase(null);
          setCaseImageFiles([]);
          setRevision((n) => n + 1);
          setActivePage("cases");
          notify(
            `El caso ${savedCase.id} se guardó, pero algún adjunto no pudo guardarse: ${cause instanceof Error ? cause.message : "error desconocido"}`,
          );
          return;
        }
        setModal("");
        setEditingCase(null);
        setCaseImageFiles([]);
        setRevision((n) => n + 1);
        setActivePage("cases");
        notify(
          modal === "edit-case"
            ? `Caso ${savedCase.id} actualizado.`
            : "Caso de prueba guardado en PostgreSQL.",
        );
        return;
      }
      if (modal === "bug") {
        await createBug({
          projectId,
          title,
          description: bugForm.description,
          priority: bugForm.priority,
          severity: String(form.get("severity") ?? "Media") as Bug["priority"],
          environment: String(form.get("environment") ?? ""),
          affectedVersion: String(form.get("affectedVersion") ?? ""),
          assignee: bugForm.assignee.trim() || null,
          assigneeUserId: assigneeUserId || null,
          tagIds: selectedTagIds,
        });
        if (!isCurrent()) return;
      } else if (modal === "evidence") {
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("Selecciona un archivo de evidencia.");
        await uploadEvidenceFile(
          null,
          projectId,
          file,
          typeof body.related === "string" ? body.related : null,
        );
        if (!isCurrent()) return;
      } else {
        await api(path, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Idempotency-Key": creationKey.current },
        });
        if (!isCurrent()) return;
      }
      setModal("");
      setRevision((n) => n + 1);
      setActivePage(
        path === "/test-cases"
          ? "cases"
          : path === "/test-runs"
            ? "runs"
            : path === "/evidence"
              ? "evidence"
              : "bugs",
      );
      notify(
        path === "/evidence"
          ? "Metadatos guardados. El archivo no se subió."
          : modal === "evidence"
            ? "Archivo guardado en PostgreSQL."
            : "Registro guardado en PostgreSQL.",
      );
    } catch (cause) {
      if (!isCurrent()) return;
      setFormError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      if (isCurrent()) setSaving(false);
    }
  }
  async function exportSelectedRecord(format: ExportFormat) {
    if (!exportTarget || exportingRecord) return;
    setExportingRecord(true);
    try {
      await exportRecord(format, exportTarget);
      setExportTarget(null);
      notify(
        `Se exportó ${exportTarget.record.id} como ${format === "md" ? "Markdown" : format.toUpperCase()}.`,
      );
    } catch (cause) {
      notify(
        cause instanceof Error
          ? `No se pudo exportar el registro: ${cause.message}`
          : "No se pudo exportar el registro.",
        "error",
      );
    } finally {
      setExportingRecord(false);
    }
  }
  async function changeBugStatus(bug: Bug, status: BugStatus) {
    if (!bug.projectId || updatingStatus) return;
    setUpdatingStatus(bug.id);
    const isCurrent = captureScope();
    try {
      const updated = await saveBugStatus(bug.id, bug.projectId, status);
      if (!isCurrent()) return;
      setData((current) => ({
        ...current,
        bugs: current.bugs.map((item) => (item.id === updated.id ? updated : item)),
      }));
      notify(`Estado de ${bug.id} actualizado.`);
    } catch (cause) {
      if (!isCurrent()) return;
      notify(
        cause instanceof Error
          ? `No se pudo actualizar ${bug.id}: ${cause.message}`
          : `No se pudo actualizar ${bug.id}.`,
        "error",
      );
    } finally {
      if (isCurrent()) setUpdatingStatus("");
    }
  }
  async function changeCaseStatus(testCase: TestCase, status: CaseStatus) {
    if (!testCase.projectId || updatingStatus) return;
    setUpdatingStatus(testCase.id);
    const isCurrent = captureScope();
    try {
      const updated = await saveCaseStatus(testCase.id, testCase.projectId, status);
      if (!isCurrent()) return;
      setData((current) => ({
        ...current,
        cases: current.cases.map((item) => (item.id === updated.id ? updated : item)),
      }));
      notify(`Estado de ${testCase.id} actualizado.`);
    } catch (cause) {
      if (!isCurrent()) return;
      notify(
        cause instanceof Error
          ? `No se pudo actualizar ${testCase.id}: ${cause.message}`
          : `No se pudo actualizar ${testCase.id}.`,
        "error",
      );
    } finally {
      if (isCurrent()) setUpdatingStatus("");
    }
  }
  async function removeCase() {
    if (!deleteCaseTarget?.projectId || deleteCaseBusy) return;
    setDeleteCaseBusy(true);
    setDeleteCaseError("");
    const isCurrent = captureScope();
    try {
      await deleteTestCase(deleteCaseTarget.id, deleteCaseTarget.projectId);
      if (!isCurrent()) return;
      setDeleteCaseTarget(null);
      setExportTarget(null);
      setDetail(null);
      setRevision((n) => n + 1);
      notify(`Se eliminó el caso ${deleteCaseTarget.id}.`);
    } catch (cause) {
      if (!isCurrent()) return;
      setDeleteCaseError(cause instanceof Error ? cause.message : "No se pudo eliminar el caso.");
    } finally {
      if (isCurrent()) setDeleteCaseBusy(false);
    }
  }
  async function removeBug() {
    if (!deleteBugTarget?.projectId || deleteBugBusy) return;
    setDeleteBugBusy(true);
    setDeleteBugError("");
    const isCurrent = captureScope();
    try {
      await deleteBug(deleteBugTarget.id, deleteBugTarget.projectId);
      if (!isCurrent()) return;
      setDeleteBugTarget(null);
      setRevision((n) => n + 1);
      notify(`Se eliminó el bug ${deleteBugTarget.id}.`);
    } catch (cause) {
      if (!isCurrent()) return;
      setDeleteBugError(cause instanceof Error ? cause.message : "No se pudo eliminar el bug.");
    } finally {
      if (isCurrent()) setDeleteBugBusy(false);
    }
  }
  const filters =
    activePage === "bugs"
      ? ["Todos", ...projectBugStatuses]
      : activePage === "cases"
        ? ["Todos", ...caseStatuses]
        : activePage === "runs"
          ? ["Todos", "En curso", "Completado"]
          : [];
  const isListing = ["bugs", "cases", "runs", "evidence"].includes(activePage);
  const isRenderCurrent = captureScope();
  const total = matchedTotal;
  const workspace = (
    <div className="app-shell workspace">
      <aside className={`sidebar${mobileNav ? " sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand__icon" src="/favicon.svg" width="25" height="25" alt="" />
          <span>
            qaTest<span className="brand-light">GE</span>
          </span>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileNav(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace__identity">
          <strong>{project?.name ?? "Tu workspace"}</strong>
          <small>Cuenta de {user.name}</small>
          <span
            className={`role-badge role-badge--${role === "Solo lectura" ? "reader" : role.toLowerCase()}`}
            aria-label={`Rol del proyecto: ${role}`}
          >
            {role}
          </span>
        </div>
        <div className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-label">{group.section}</div>
              {group.items
                .filter(
                  (item) =>
                    (item.id !== "case-builder" || allowed("cases.write")) &&
                    (item.id !== "bug-builder" || allowed("bugs.write")),
                )
                .map((item) => (
                  <button
                    className={`nav-item${activePage === item.id ? " nav-active" : ""}`}
                    key={item.id}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
        <a className="portal-docs__link" href="/api/docs/" target="_blank" rel="noreferrer">
          <Icon name="file" />
          SwaggerUI · API ↗
        </a>
        <div className="sidebar-bottom">
          <button
            type="button"
            className="workspace__profile"
            onClick={() => navigate("settings")}
            aria-label={`Abrir configuración de ${user.name}`}
          >
            <Avatar initials={user.name.slice(0, 2).toUpperCase()} color="orange" />
            <strong>{user.name}</strong>
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="workspace__menu-toggle icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileNav}
            >
              <svg
                className="workspace__menu-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <span>{project?.name ?? "Workspace"}</span>
            <span className="crumb-slash">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-actions">
            {themeControl}
            <button className="session__logout" onClick={onLogout}>
              Salir
            </button>
            <span className="ai-pill">
              <Icon name="sparkle" size={15} /> IA no conectada
            </span>
          </div>
        </header>
        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                {new Date().toLocaleDateString("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <h1 className="typography__title">{pageTitle}</h1>
              <p className="page-subtitle">{pageDescription(activePage)}</p>
            </div>
            {![
              "coverage",
              "overview",
              "mentions",
              "plans",
              "reports",
              "case-builder",
              "bug-builder",
              "settings",
              "tags",
              "wiki",
            ].includes(activePage) && (
              <button
                disabled={
                  !projectId ||
                  loading ||
                  saving ||
                  Boolean(error) ||
                  !allowed(
                    activePage === "cases"
                      ? "cases.write"
                      : activePage === "runs"
                        ? "runs.write"
                        : activePage === "evidence"
                          ? "evidence.write"
                          : "bugs.write",
                  )
                }
                className="button button-primary"
                onClick={() =>
                  openModal(
                    activePage === "cases"
                      ? "case"
                      : activePage === "runs"
                        ? "run"
                        : activePage === "evidence"
                          ? "evidence"
                          : "bug",
                  )
                }
              >
                <Icon name="plus" />
                {activePage === "cases"
                  ? "Nuevo caso de prueba"
                  : activePage === "runs"
                    ? "Nueva ejecución"
                    : activePage === "evidence"
                      ? "Registrar metadatos"
                      : "Nuevo bug"}
              </button>
            )}
          </div>
          <div className="workspace__toolbar">
            <label>
              Proyecto
              <select
                disabled={saving}
                value={projectId}
                onChange={(event) => {
                  setData({ bugs: [], cases: [], runs: [], evidence: [] });
                  setLoading(true);
                  setProjectId(event.target.value);
                  setModal("");
                  setRunDetail(null);
                  setRecordDetail(null);
                  setDeleteBugTarget(null);
                  setDeleteCaseTarget(null);
                  setSaving(false);
                  setUpdatingStatus("");
                  setDeleteBugBusy(false);
                  setDeleteCaseBusy(false);
                }}
              >
                <option value="" disabled>
                  Selecciona un proyecto
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · #{p.id}
                  </option>
                ))}
              </select>
            </label>
            <div className="workspace__toolbar-actions">
              <button
                className="workspace__secondary"
                disabled={loading || saving}
                onClick={() => {
                  setError("");
                  setLoading(true);
                  setRevision((n) => n + 1);
                  notify("Actualizando datos del proyecto…", "info");
                }}
              >
                Actualizar
              </button>
              {projectId &&
                (activePage === "bugs" || activePage === "cases" || activePage === "tags") &&
                allowed(
                  activePage === "bugs"
                    ? "bugs.write"
                    : activePage === "cases"
                      ? "cases.write"
                      : "tags.write",
                ) && (
                  <ImportPanel
                    key={`import:${user.id}:${projectId}:${activePage}`}
                    projectId={projectId}
                    kind={activePage}
                    onChanged={() => {
                      if (isRenderCurrent()) setRevision((v) => v + 1);
                    }}
                  />
                )}
            </div>
          </div>
          {loading && (
            <p className="workspace__notice" role="status">
              Cargando datos del proyecto…
            </p>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {workflowError && <Alert tone="error">{workflowError}</Alert>}
          {activePage === "cases" && projectId && (
            <>
              <div className="quality__filters">
                <label className="workspace__field">
                  Tipo de prueba
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setTablePage(1);
                    }}
                  >
                    <option>Todos</option>
                    {[...new Set(cases.map((c) => c.testType ?? "Funcional"))].sort().map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="workspace__field">
                  Estado del caso
                  <select
                    value={lifecycleFilter}
                    onChange={(e) => {
                      setLifecycleFilter(e.target.value);
                      setTablePage(1);
                    }}
                  >
                    {["Todos", "Borrador", "Listo", "Obsoleto"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
          {preferencesError && <Alert tone="error">{preferencesError}</Alert>}
          {!loading && !error && !projectId && activePage !== "settings" && (
            <p className="workspace__notice">
              No tienes proyectos disponibles. El administrador debe conceder acceso a un espacio
              existente.
            </p>
          )}
          {activePage === "mentions" ? (
            projectId && (
              <MentionsView
                key={projectId}
                projectId={projectId}
                onOpen={async (target, signal) => {
                  const isCurrent = captureScope();
                  const loaded = await loadProject(projectId, signal);
                  if (!isCurrent() || signal.aborted) return false;
                  const { bugs, cases, runs } = loaded;
                  const exists =
                    target.kind === "bug"
                      ? bugs.some((b) => b.id === target.id)
                      : target.kind === "case"
                        ? cases.some((c) => c.id === target.id)
                        : runs.some((r) => r.id === target.id);
                  if (!exists)
                    throw new Error("El registro de esta mención ya no está disponible.");
                  setData(loaded);
                  if (target.kind === "bug") {
                    const record = bugs.find((b) => b.id === target.id);
                    if (record) setRecordDetail({ kind: "bug", record });
                  } else if (target.kind === "case") {
                    const record = cases.find((c) => c.id === target.id);
                    if (record) setRecordDetail({ kind: "case", record });
                  } else {
                    const run = runs.find((r) => r.id === target.id);
                    if (run) {
                      setRunAction("view");
                      setRunDetail(run);
                    }
                  }
                  return true;
                }}
              />
            )
          ) : activePage === "plans" ? (
            projectId && (
              <TestPlansView
                key={`${user.id}:${projectId}`}
                projectId={projectId}
                cases={cases}
                onChanged={() => {
                  if (isRenderCurrent()) setRevision((v) => v + 1);
                }}
              />
            )
          ) : activePage === "settings" ? (
            <AccountSettingsView
              projects={projects}
              projectId={projectId}
              projectName={project?.name ?? "Proyecto"}
              refreshRevision={revision}
              onProjectChanged={() => {
                if (isRenderCurrent()) setRevision((v) => v + 1);
              }}
              user={user}
              onUserUpdated={onUserUpdated}
              onAccountDeleted={onAccountDeleted}
              preferences={preferences}
              onPreferencesChanged={savePreferences}
            />
          ) : activePage === "wiki" ? (
            <WikiView />
          ) : activePage === "bug-builder" ? (
            !loading &&
            !error &&
            projectId && (
              <BugDesignView
                key={`${user.id}:${projectId}`}
                userId={user.id}
                projectId={projectId}
                tags={tags}
                tagError={tagError}
                onSaved={((isCurrent) => (bug) => {
                  if (isCurrent())
                    setData((current) => ({
                      ...current,
                      bugs: [bug, ...current.bugs.filter((item) => item.id !== bug.id)],
                    }));
                })(captureScope())}
              />
            )
          ) : activePage === "case-builder" ? (
            <CaseBuilder
              key={`${user.id}:${projectId}`}
              catalog={caseCatalog}
              defaultCounts={caseCountDefaults}
              defaultSelectedCategories={caseDesignCategories}
              projectId={projectId}
            />
          ) : activePage === "tags" ? (
            projectId && (
              <>
                {tagError ? (
                  <Alert tone="error">{tagError}</Alert>
                ) : error ? (
                  <Alert tone="error">{error}</Alert>
                ) : (
                  <TagsView
                    key={`${user.id}:${projectId}`}
                    projectId={projectId}
                    tags={tags}
                    onChanged={() => setRevision((current) => current + 1)}
                  />
                )}
              </>
            )
          ) : activePage === "coverage" ? (
            projectId && (
              <CoverageView
                key={`${user.id}:${projectId}`}
                projectId={projectId}
                refreshRevision={revision}
              />
            )
          ) : activePage === "reports" ? (
            !loading &&
            !error &&
            projectId && (
              <ReportsView
                key={`${user.id}:${projectId}`}
                projectId={projectId}
                projectName={project?.name ?? "Proyecto"}
                refreshRevision={revision}
              />
            )
          ) : (
            !loading &&
            !error &&
            projectId &&
            (activePage === "overview" ? (
              <DashboardView
                key={`${user.id}:${projectId}:${revision}`}
                projectId={projectId}
                onNavigate={navigate}
              />
            ) : isListing ? (
              <section className="listing-card">
                <div className="listing-toolbar listing-filters">
                  <div className="listing-filters__tabs">
                    {filters.map((filter) => (
                      <button
                        key={filter}
                        className={`listing-filters__tab${statusFilter === filter ? " listing-filters__tab--active" : ""}`}
                        onClick={() => {
                          setStatusFilter(filter);
                          setTablePage(1);
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <label className="search-field">
                    <Icon name="search" />
                    <input
                      aria-label="Buscar registros"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setTablePage(1);
                      }}
                      placeholder={`Buscar ${pageTitle.toLowerCase()}…`}
                    />
                  </label>
                </div>
                {activePage !== "evidence" && (
                  <div className="workspace-table__toolbar">
                    <TableExport
                      data={
                        activePage === "bugs"
                          ? bugTableExport(visibleBugs, tags)
                          : activePage === "cases"
                            ? caseTableExport(visibleCases, tags)
                            : runTableExport(visibleRuns, tags)
                      }
                    />
                  </div>
                )}
                {activePage === "bugs" && (
                  <BugTable
                    workflow={workflow}
                    bugs={visibleBugs}
                    tags={tags}
                    onSelect={(bug) => setRecordDetail({ kind: "bug", record: bug })}
                    onExport={(bug) => setExportTarget({ kind: "bug", record: bug })}
                    onEdit={editBug}
                    onDelete={(bug) => {
                      setDeleteBugError("");
                      setDeleteBugTarget(bug);
                    }}
                    onStatusChange={(bug, status) => void changeBugStatus(bug, status)}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "cases" && (
                  <CaseTable
                    items={visibleCases}
                    tags={tags}
                    onSelect={(testCase) => setRecordDetail({ kind: "case", record: testCase })}
                    onExport={(item) => setExportTarget({ kind: "case", record: item })}
                    onEdit={editCase}
                    onDelete={(item) => {
                      setDeleteCaseError("");
                      setDeleteCaseTarget(item);
                    }}
                    onStatusChange={(item, status) => void changeCaseStatus(item, status)}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "runs" && (
                  <RunTable
                    items={visibleRuns}
                    tags={tags}
                    onExecute={(run) => {
                      setRunAction("execute");
                      setRunDetail(run);
                    }}
                    onSelect={(run, action) => {
                      setRunAction(action);
                      setRunDetail(run);
                    }}
                  />
                )}
                {activePage === "evidence" && (
                  <EvidenceTable
                    items={visibleEvidence}
                    onSelect={setDetail}
                    onActions={setEvidenceActionTarget}
                  />
                )}
                {!total && (
                  <p className="workspace__notice">
                    No hay registros que coincidan con los filtros.
                  </p>
                )}
                <TableFooter
                  total={total}
                  page={currentTablePage}
                  pageSize={50}
                  onPage={setTablePage}
                />
              </section>
            ) : null)
          )}
          <Footer
            version={version}
            status={
              error
                ? "Datos no disponibles"
                : loading
                  ? "Actualizando datos…"
                  : "Datos persistidos en PostgreSQL"
            }
          />
        </div>
      </main>
      {modal && (
        <Dialog
          wide
          title={
            modal === "bug"
              ? "Nuevo bug"
              : modal === "edit-bug"
                ? "Editar bug"
                : modal === "case"
                  ? "Nuevo caso de prueba"
                  : modal === "edit-case"
                    ? `Editar ${editingCase?.id ?? "caso"}`
                    : modal === "run"
                      ? "Nueva ejecución"
                      : modal === "edit-evidence"
                        ? "Editar evidencia"
                        : modal === "upload-evidence"
                          ? `Archivo de ${editingEvidence?.id ?? "evidencia"}`
                          : "Registrar metadatos"
          }
          onClose={() => {
            if (!saving) {
              setModal("");
              setEditingCase(null);
            }
          }}
        >
          <form
            key={modal}
            className="workspace__form"
            onSubmit={(event) => void save(event)}
            aria-busy={saving}
          >
            <fieldset disabled={saving} className="workspace__fieldset">
              <label className="workspace__field">
                Proyecto
                <input value={project?.name ?? ""} readOnly />
              </label>
              {modal === "bug" && (
                <label className="workspace__field">
                  Cargar plantilla
                  {bugTemplatesLoading ? (
                    <span className="workspace__notice">Cargando plantillas…</span>
                  ) : (
                    <select
                      value={selectedBugTemplateId}
                      onChange={(event) => applyBugTemplate(event.target.value)}
                    >
                      <option value="">Sin plantilla</option>
                      {bugTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              )}
              {modal !== "evidence" && modal !== "edit-evidence" && modal !== "upload-evidence" && (
                <label className="workspace__field">
                  Título
                  {modal === "bug" || modal === "edit-bug" ? (
                    <input
                      name="title"
                      value={bugForm.title}
                      onChange={(event) => setBugForm({ ...bugForm, title: event.target.value })}
                      maxLength={200}
                      required
                    />
                  ) : (
                    <input
                      name="title"
                      maxLength={200}
                      defaultValue={editingCase?.title ?? ""}
                      required
                    />
                  )}
                </label>
              )}
              {(modal === "bug" || modal === "edit-bug") && (
                <>
                  {modal === "bug" && bugTemplatesError && (
                    <Alert tone="error">{bugTemplatesError}</Alert>
                  )}
                  <label className="workspace__field">
                    Descripción
                    <textarea
                      name="description"
                      value={bugForm.description}
                      onChange={(event) =>
                        setBugForm({ ...bugForm, description: event.target.value })
                      }
                      maxLength={5000}
                      rows={6}
                    />
                  </label>
                  <label className="workspace__field">
                    Prioridad
                    <select
                      name="priority"
                      value={bugForm.priority}
                      onChange={(event) =>
                        setBugForm({
                          ...bugForm,
                          priority: event.target.value as BugTemplatePriority,
                        })
                      }
                    >
                      <option>Crítica</option>
                      <option>Alta</option>
                      <option>Media</option>
                      <option>Baja</option>
                    </select>
                  </label>
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                  {modal === "edit-bug" && (
                    <>
                      <label className="workspace__field">
                        Estado
                        <select
                          name="status"
                          value={bugForm.status}
                          onChange={(event) =>
                            setBugForm({ ...bugForm, status: event.target.value as BugStatus })
                          }
                        >
                          {[bugForm.status, ...(workflow?.transitions[bugForm.status] ?? [])]
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                        </select>
                      </label>
                      <label className="workspace__field">
                        Responsable anterior (texto)
                        <input
                          name="assignee"
                          value={bugForm.assignee}
                          onChange={(event) =>
                            setBugForm({ ...bugForm, assignee: event.target.value })
                          }
                          maxLength={100}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {(modal === "bug" || modal === "edit-bug") && (
                <>
                  <label className="workspace__field">
                    Severidad
                    <select name="severity" defaultValue={editingBug?.severity ?? "Media"}>
                      {["Crítica", "Alta", "Media", "Baja"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="workspace__field">
                    Entorno
                    <input
                      name="environment"
                      maxLength={100}
                      defaultValue={editingBug?.environment ?? ""}
                    />
                  </label>
                  <label className="workspace__field">
                    Versión afectada
                    <input
                      name="affectedVersion"
                      maxLength={100}
                      defaultValue={editingBug?.affectedVersion ?? ""}
                    />
                  </label>
                </>
              )}
              {["bug", "edit-bug", "case", "edit-case"].includes(modal) && (
                <>
                  {teamMemberError && <Alert tone="error">{teamMemberError}</Alert>}
                  <label className="workspace__field">
                    Responsable QA
                    <select
                      value={assigneeUserId}
                      onChange={(event) => setAssigneeUserId(event.target.value)}
                      disabled={Boolean(teamMemberError)}
                    >
                      <option value="">Sin asignar</option>
                      {assigneeUserId &&
                        !teamMembers.some((member) => member.id === assigneeUserId) && (
                          <option value={assigneeUserId}>
                            Responsable inactivo o no disponible
                          </option>
                        )}
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {(modal === "case" || modal === "edit-case") && (
                <>
                  <label className="workspace__field">
                    Tipo de prueba
                    <input
                      name="testType"
                      required
                      maxLength={100}
                      list="case-types"
                      defaultValue={editingCase?.testType ?? "Funcional"}
                    />
                    <datalist id="case-types">
                      {[
                        "Funcional",
                        "Regresión",
                        "Seguridad",
                        "Smoke",
                        "Sanity",
                        "API",
                        "UAT",
                        "Exploratorias",
                        "Edge",
                      ].map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </label>
                  <label className="workspace__field">
                    Estado del caso
                    <select name="lifecycle" defaultValue={editingCase?.lifecycle ?? "Borrador"}>
                      {["Borrador", "Listo", "Obsoleto"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="workspace__field">
                    Suite (opcional)
                    <input name="suite" maxLength={100} defaultValue={editingCase?.suite ?? ""} />
                  </label>
                  <label className="workspace__field">
                    Precondiciones
                    <textarea
                      name="preconditions"
                      maxLength={10000}
                      defaultValue={editingCase?.preconditions ?? ""}
                    />
                  </label>
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                  <fieldset className="workspace__step-editor">
                    <legend>Pasos y resultados esperados · {caseSteps.length}/100</legend>
                    <table className="workspace__steps-table">
                      <thead>
                        <tr>
                          <th scope="col">Paso</th>
                          <th scope="col">Acción</th>
                          <th scope="col">Resultado esperado</th>
                          <th scope="col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseSteps.map((step, index) => (
                          <tr key={index}>
                            <th scope="row">{index + 1}</th>
                            <td data-label="Acción">
                              <textarea
                                aria-label="Acción"
                                name="action"
                                maxLength={10000}
                                rows={3}
                                value={step.action}
                                onChange={(event) =>
                                  setCaseSteps((current) =>
                                    current.map((item, stepIndex) =>
                                      stepIndex === index
                                        ? { ...item, action: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td data-label="Resultado esperado">
                              <textarea
                                aria-label="Resultado esperado"
                                name="expectedResult"
                                maxLength={10000}
                                rows={3}
                                value={step.expectedResult}
                                onChange={(event) =>
                                  setCaseSteps((current) =>
                                    current.map((item, stepIndex) =>
                                      stepIndex === index
                                        ? { ...item, expectedResult: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="workspace__secondary"
                                disabled={caseSteps.length <= 1}
                                onClick={() =>
                                  setCaseSteps((steps) =>
                                    steps.length <= 1
                                      ? steps
                                      : steps.filter((_item, stepIndex) => stepIndex !== index),
                                  )
                                }
                              >
                                Eliminar paso
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      className="workspace__secondary"
                      disabled={caseSteps.length >= 100}
                      onClick={() =>
                        setCaseSteps((steps) =>
                          steps.length >= 100
                            ? steps
                            : [...steps, { action: "", expectedResult: "" }],
                        )
                      }
                    >
                      Añadir paso
                    </button>
                  </fieldset>
                  <label className="workspace__field">
                    Enlaces relacionados (uno por línea)
                    <textarea
                      name="attachmentLinks"
                      rows={3}
                      placeholder="https://docs.example.com/especificacion"
                    />
                  </label>
                  <div
                    className={`workspace__image-dropzone${caseImageDragging ? " workspace__image-dropzone--active" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setCaseImageDragging(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) setCaseImageDragging(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setCaseImageDragging(false);
                      addCaseImages(event.dataTransfer.files);
                    }}
                  >
                    <strong>Imágenes del caso</strong>
                    <span>
                      Arrastra imágenes aquí o selecciónalas desde tu dispositivo. PNG, JPEG, GIF o
                      WebP; máximo 2 MB cada una y 5 por operación.
                    </span>
                    <label className="workspace__secondary workspace__image-picker">
                      Seleccionar imágenes
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        multiple
                        onChange={(event) => {
                          if (event.target.files) addCaseImages(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {caseImageFiles.map((file, index) => (
                      <div
                        className="workspace__image-file"
                        key={`${file.name}:${file.lastModified}:${index}`}
                      >
                        <span>
                          {file.name} · {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          className="workspace__secondary"
                          onClick={() =>
                            setCaseImageFiles((current) =>
                              current.filter((_item, fileIndex) => fileIndex !== index),
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {modal === "run" && (
                <>
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                  <fieldset className="workspace__fieldset">
                    <legend>Casos de este proyecto</legend>
                    {cases.map((c) => (
                      <label className="workspace__check" key={c.id}>
                        <input type="checkbox" name="caseIds" value={c.id} />
                        {c.id} · {c.title}
                      </label>
                    ))}
                    {!cases.length && (
                      <p>Crea primero tus casos de prueba o guarda una ejecución vacía.</p>
                    )}
                  </fieldset>
                </>
              )}
              {modal === "evidence" && (
                <>
                  <p className="workspace__notice">
                    El archivo se almacena de forma privada en PostgreSQL y solo se descarga con
                    acceso al proyecto. Tamaño máximo: 2 MiB.
                  </p>
                  <label className="workspace__field">
                    Archivo
                    <input name="file" type="file" required />
                  </label>
                  <label className="workspace__field">
                    Vincular a
                    <select name="related">
                      <option value="">Sin vincular</option>
                      {[...bugs, ...cases, ...runs].map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} · {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {modal === "upload-evidence" && (
                <>
                  <p className="workspace__notice">
                    {editingEvidence?.hasFile
                      ? "Subir un archivo reemplazará el contenido actual. La descarga seguirá protegida por sesión y proyecto."
                      : "El archivo se almacenará de forma privada y estará disponible para descarga autenticada."}{" "}
                    Máximo 2 MiB.
                  </p>
                  <label className="workspace__field">
                    Archivo
                    <input name="file" type="file" required />
                  </label>
                </>
              )}
              {modal === "edit-evidence" && (
                <>
                  <p className="workspace__notice">
                    Se editarán los metadatos. Usa las acciones de evidencia para subir o descargar
                    su archivo. Si no cambias el vínculo, se conservarán todas las referencias
                    actuales.
                  </p>
                  <label className="workspace__field">
                    Nombre
                    <input
                      name="name"
                      value={evidenceForm.name}
                      onChange={(event) =>
                        setEvidenceForm({ ...evidenceForm, name: event.target.value })
                      }
                      maxLength={255}
                      required
                    />
                  </label>
                  <label className="workspace__field">
                    Tipo
                    <select
                      name="type"
                      value={evidenceForm.type}
                      onChange={(event) =>
                        setEvidenceForm({
                          ...evidenceForm,
                          type: event.target.value as Evidence["type"],
                        })
                      }
                      disabled={editingEvidence?.hasFile}
                    >
                      <option>Imagen</option>
                      <option>Video</option>
                      <option>Archivo</option>
                    </select>
                  </label>
                  <label className="workspace__field">
                    Tamaño en bytes
                    <input
                      name="sizeBytes"
                      type="number"
                      min={0}
                      step={1}
                      value={evidenceForm.sizeBytes}
                      onChange={(event) =>
                        setEvidenceForm({
                          ...evidenceForm,
                          sizeBytes: event.target.valueAsNumber,
                        })
                      }
                      disabled={editingEvidence?.hasFile}
                      required
                    />
                  </label>
                  <label className="workspace__field">
                    Vincular a
                    <select
                      name="related"
                      value={evidenceForm.related}
                      onChange={(event) => {
                        setEvidenceForm({ ...evidenceForm, related: event.target.value });
                        setEvidenceRelatedChanged(true);
                      }}
                    >
                      <option value="">Sin vincular</option>
                      {[...bugs, ...cases, ...runs].map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} · {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </fieldset>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="workspace__actions">
              <button
                type="button"
                className="workspace__secondary"
                disabled={saving}
                onClick={() => {
                  setModal("");
                  setEditingCase(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  (Boolean(teamMemberError) &&
                    ["bug", "edit-bug", "case", "edit-case"].includes(modal))
                }
                className="button button-primary"
              >
                {saving
                  ? "Guardando…"
                  : ["edit-case", "edit-bug", "edit-evidence"].includes(modal)
                    ? "Guardar cambios"
                    : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {runDetail && (
        <TestRunDialog
          key={runDetail.id}
          run={runDetail}
          bugs={bugs}
          evidence={evidence}
          onCreated={(created) => {
            if (!isRenderCurrent()) return;
            setRunDetail(created);
            setRevision((v) => v + 1);
          }}
          initialAction={runAction}
          cases={cases}
          userId={user.id}
          onClose={() => setRunDetail(null)}
          onChanged={(updated) => {
            if (!isRenderCurrent()) return;
            setRunDetail(updated);
            setRevision((current) => current + 1);
          }}
          onDeleted={() => {
            if (!isRenderCurrent()) return;
            setRunDetail(null);
            notify("Ejecución eliminada.");
            setRevision((current) => current + 1);
          }}
        />
      )}
      {recordDetail && (
        <RecordDetailsDialog
          detail={recordDetail}
          onClose={() => setRecordDetail(null)}
          onEdit={() => {
            if (recordDetail.kind === "bug") editBug(recordDetail.record);
            else editCase(recordDetail.record);
          }}
        >
          {recordDetail.kind === "bug" && (
            <>
              <div className="quality__actions">
                {recordDetail.record.sourceRunId && (
                  <button
                    className="workspace__secondary"
                    onClick={() => {
                      const source = runs.find((r) => r.id === recordDetail.record.sourceRunId);
                      if (source) {
                        setRunDetail(source);
                        setRecordDetail(null);
                      }
                    }}
                  >
                    Abrir ejecución de origen
                  </button>
                )}
              </div>
              {evidence
                .filter((e) => e.related.split(", ").includes(recordDetail.record.id))
                .map((e) => (
                  <p key={e.id}>
                    {e.id} · {e.name}
                    {e.hasFile && (
                      <button
                        className="workspace__secondary"
                        onClick={() => {
                          void downloadEvidenceFile(e.id, projectId, e.name).catch(
                            (cause: unknown) => {
                              if (isRenderCurrent())
                                notify(
                                  cause instanceof Error
                                    ? cause.message
                                    : "No se pudo descargar la evidencia.",
                                  "error",
                                );
                            },
                          );
                        }}
                      >
                        Descargar evidencia
                      </button>
                    )}
                  </p>
                ))}
            </>
          )}
          <CollaborationPanel
            key={`${projectId}:${recordDetail.record.id}`}
            projectId={projectId}
            userId={user.id}
            target={{ kind: recordDetail.kind, id: recordDetail.record.id }}
          />
          {recordDetail.kind === "case" && (
            <>
              <CaseAttachmentsPanel testCase={recordDetail.record} />
              <CaseHistoryPanel
                key={recordDetail.record.id}
                caseId={recordDetail.record.id}
                projectId={projectId}
              />
            </>
          )}
        </RecordDetailsDialog>
      )}
      {detail && (
        <Dialog wide title="Detalle del registro" onClose={() => setDetail(null)}>
          <dl className="workspace__detail">
            {Object.entries(detail)
              .filter(([key]) => !["color", "updated", "date", "cases", "size"].includes(key))
              .map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>
                    {(
                      {
                        title: "Título",
                        description: "Descripción",
                        status: "Estado",
                        project: "Proyecto",
                        projectId: "ID de proyecto",
                        priority: "Prioridad",
                        assignee: "Responsable",
                        suite: "Suite",
                        preconditions: "Precondiciones",
                        steps: "Pasos",
                        owner: "Responsable",
                        caseIds: "Casos",
                        caseCount: "Cantidad de casos",
                        progress: "Progreso",
                        name: "Nombre",
                        type: "Tipo",
                        related: "Vinculado a",
                        sizeBytes: "Tamaño en bytes",
                        createdAt: "Creación",
                      } as Record<string, string>
                    )[key] ?? key}
                  </dt>
                  <dd>
                    {typeof value === "object" ? (
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                    ) : (
                      String(value ?? "—")
                    )}
                  </dd>
                </React.Fragment>
              ))}
          </dl>
          {isTestCaseRecord(detail) && <CaseAttachmentsPanel testCase={detail} />}
        </Dialog>
      )}
      {evidenceActionTarget && (
        <Dialog title={evidenceActionTarget.name} onClose={() => setEvidenceActionTarget(null)}>
          <p className="workspace__notice">Gestiona los metadatos de esta evidencia.</p>
          <div className="workspace__evidence-actions">
            {evidenceActionTarget.hasFile && (
              <button
                type="button"
                className="workspace__secondary"
                onClick={() => void downloadEvidence(evidenceActionTarget)}
              >
                Descargar archivo
              </button>
            )}
            <button
              type="button"
              className="workspace__secondary"
              disabled={!allowed("evidence.write")}
              onClick={() => {
                setEditingEvidence(evidenceActionTarget);
                setEvidenceActionTarget(null);
                setFormError("");
                setModal("upload-evidence");
              }}
            >
              {evidenceActionTarget.hasFile ? "Reemplazar archivo" : "Subir archivo"}
            </button>
            <button
              type="button"
              className="workspace__secondary"
              disabled={!allowed("evidence.write")}
              onClick={() => editEvidence(evidenceActionTarget)}
            >
              Editar metadatos
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={!allowed("evidence.write")}
              onClick={() => {
                setEvidenceToDelete(evidenceActionTarget);
                setEvidenceActionTarget(null);
                setFormError("");
              }}
            >
              Eliminar evidencia
            </button>
          </div>
        </Dialog>
      )}
      {evidenceToDelete && (
        <Dialog
          title="Eliminar evidencia"
          onClose={() => {
            if (!saving) {
              setEvidenceToDelete(null);
              setFormError("");
            }
          }}
        >
          <p>
            ¿Quieres eliminar los metadatos de <strong>{evidenceToDelete.name}</strong>? Esta acción
            no se puede deshacer.
          </p>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={saving}
              onClick={() => {
                setEvidenceToDelete(null);
                setFormError("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={saving}
              onClick={() => void removeEvidence()}
            >
              {saving ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </Dialog>
      )}
      {exportTarget && (
        <Dialog
          title={`Exportar ${exportTarget.record.id}`}
          onClose={() => {
            if (!exportingRecord) setExportTarget(null);
          }}
        >
          <p className="workspace__notice">
            Elige un formato para exportar este registro y todos sus pasos/resultados.
          </p>
          <div className="workspace__export-options">
            {recordExportFormats.map((format) => (
              <button
                className="workspace__export-option"
                type="button"
                key={format}
                disabled={exportingRecord}
                onClick={() => void exportSelectedRecord(format)}
              >
                {exportingRecord
                  ? "Preparando…"
                  : format === "pdf"
                    ? "Exportar como PDF"
                    : format === "xlsx"
                      ? "Exportar como Excel"
                      : "Exportar como Markdown"}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {deleteBugTarget && (
        <Dialog
          title={`Eliminar ${deleteBugTarget.id}`}
          onClose={() => {
            if (!deleteBugBusy) setDeleteBugTarget(null);
          }}
        >
          <p className="workspace__notice">
            El bug se eliminará. Si tiene casos o evidencias vinculadas, primero debes revisar esas
            relaciones.
          </p>
          {deleteBugError && <Alert tone="error">{deleteBugError}</Alert>}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={deleteBugBusy}
              onClick={() => setDeleteBugTarget(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={deleteBugBusy}
              onClick={() => void removeBug()}
            >
              {deleteBugBusy ? "Eliminando…" : "Eliminar bug"}
            </button>
          </div>
        </Dialog>
      )}
      {deleteCaseTarget && (
        <Dialog
          title={`Eliminar ${deleteCaseTarget.id}`}
          onClose={() => {
            if (!deleteCaseBusy) {
              setDeleteCaseTarget(null);
              setDeleteCaseError("");
            }
          }}
        >
          <p className="workspace__notice">
            Esta acción elimina el caso y sus adjuntos. No se puede borrar si otras relaciones, como
            una ejecución, hacen referencia a él.
          </p>
          {deleteCaseError && <Alert tone="error">{deleteCaseError}</Alert>}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={deleteCaseBusy}
              onClick={() => {
                setDeleteCaseTarget(null);
                setDeleteCaseError("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={deleteCaseBusy}
              onClick={() => void removeCase()}
            >
              {deleteCaseBusy ? "Eliminando…" : "Eliminar caso"}
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <Alert
          className="workspace-toast"
          tone={toastTone}
          onDismiss={() => {
            clearTimeout(toastTimer.current);
            setToast("");
          }}
        >
          {toast}
        </Alert>
      )}
    </div>
  );
  return <ProjectPermissionsProvider role={role}>{workspace}</ProjectPermissionsProvider>;
}

function pageDescription(page: NavigationPage): string {
  return {
    mentions: "Consulta las menciones de tus compañeros dentro del proyecto.",
    coverage: "Conecta requisitos, casos y bugs del proyecto.",
    overview: "Aquí tienes el estado de calidad de tus proyectos.",
    plans: "Agrupa casos y organiza ciclos de ejecución.",
    reports: "Consulta indicadores, estados y resultados del proyecto seleccionado.",
    bugs: "Registra, prioriza y da seguimiento a las incidencias de tus proyectos.",
    cases: "Organiza los escenarios que mantienen tu producto bajo control.",
    runs: "Ejecuta suites de prueba y consulta sus resultados.",
    evidence: "Capturas, videos y archivos vinculados a tu actividad de QA.",
    tags: "Crea tags por proyecto y clasifica bugs, casos de prueba y ejecuciones.",
    settings: "Administra tu cuenta, los accesos y la configuración del proyecto.",
    wiki: "Aprende a utilizar las funciones disponibles de qaTestGE.",
    "bug-builder": "Convierte tu descripción en un borrador de bug y revísalo antes de guardar.",
    "case-builder": "De una idea a un plan de pruebas: explora la maqueta del futuro asistente.",
  }[page];
}

export default App;
