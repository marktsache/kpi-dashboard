"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, kstColor } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Loading } from "@/components/ui/loading";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs } from "@/components/ui/tabs";

// ── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  photoUrl: string | null;
  jobTitle: string | null;
  startDate: string | null;
  active: boolean;
  createdAt: string;
  _count: { kpiEntries: number };
}

interface EmployeeFormData {
  name: string;
  costCenter: string;
  jobTitle: string;
  startDate: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COST_CENTER_OPTIONS = [
  { value: "330", label: "KST 330" },
  { value: "350", label: "KST 350" },
  { value: "370", label: "KST 370" },
];

const FILTER_COST_CENTER_OPTIONS = [
  { value: "all", label: "Alle Kostenstellen" },
  ...COST_CENTER_OPTIONS,
];

const FILTER_STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "true", label: "Aktiv" },
  { value: "false", label: "Inaktiv" },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Erstellt", color: "bg-emerald-100 text-emerald-700" },
  update: { label: "Aktualisiert", color: "bg-blue-100 text-blue-700" },
  delete: { label: "Gelöscht", color: "bg-red-100 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  KpiEntry: "KPI-Eintrag",
  Employee: "Mitarbeiter",
};

const TABS = [
  { key: "mitarbeiter", label: "Mitarbeiter" },
  { key: "benutzer", label: "Benutzer" },
  { key: "audit", label: "Audit-Log" },
];

const emptyForm: EmployeeFormData = { name: "", costCenter: "330", jobTitle: "", startDate: "" };

// ── Component ──────────────────────────────────────────────────────────────

export default function EinstellungenPage() {
  const { status, data: session, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")!
    : "mitarbeiter";
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Mitarbeiter State ──
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    employee: Employee;
    action: "deactivate" | "activate";
  } | null>(null);

  // Photo upload state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Audit State ──
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  // ── Benutzer State ──
  interface UserItem { id: string; name: string; email: string; role: string; photoUrl: string | null }
  interface UserFormData { name: string; email: string; password: string; passwordConfirm: string }
  const emptyUserForm: UserFormData = { name: "", email: "", password: "", passwordConfirm: "" };
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userCreateModalOpen, setUserCreateModalOpen] = useState(false);
  const [userEditModalOpen, setUserEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyUserForm);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userDeleteConfirm, setUserDeleteConfirm] = useState<UserItem | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth redirect ──
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Tab change handler ──
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    if (key === "mitarbeiter") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", key);
    }
    window.history.replaceState({}, "", url.toString());
  };

  // ── Photo handling ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setEmpError("Nur JPG, PNG, WebP und GIF sind erlaubt.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEmpError("Datei darf maximal 5MB groß sein.");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Upload fehlgeschlagen");
      }
      const { url } = await res.json();
      return url;
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resetPhotoState = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Mitarbeiter Logic ──
  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCostCenter !== "all") params.set("costCenter", filterCostCenter);
      if (filterActive !== "all") params.set("active", filterActive);
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Fehler beim Laden der Mitarbeiter");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setEmpLoading(false);
    }
  }, [filterCostCenter, filterActive]);

  useEffect(() => {
    if (status === "authenticated") fetchEmployees();
  }, [status, fetchEmployees]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.costCenter) {
      setEmpError("Name und Kostenstelle sind erforderlich.");
      return;
    }
    setSaving(true);
    setEmpError(null);
    try {
      // First create employee
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          costCenter: formData.costCenter,
          jobTitle: formData.jobTitle.trim() || undefined,
          startDate: formData.startDate || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Erstellen");
      }
      const newEmployee = await res.json();

      // Then upload photo if selected
      if (photoFile) {
        const photoUrl = await uploadPhoto();
        if (photoUrl) {
          await fetch(`/api/employees/${newEmployee.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoUrl }),
          });
        }
      }

      setCreateModalOpen(false);
      setFormData(emptyForm);
      resetPhotoState();
      await fetchEmployees();
      window.dispatchEvent(new Event("employee-updated"));
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingEmployee) return;
    if (!formData.name.trim() || !formData.costCenter) {
      setEmpError("Name und Kostenstelle sind erforderlich.");
      return;
    }
    setSaving(true);
    setEmpError(null);
    try {
      // Upload photo if new one selected
      let photoUrl: string | null | undefined = undefined;
      if (photoFile) {
        photoUrl = await uploadPhoto();
        if (photoUrl === null) {
          setSaving(false);
          return;
        }
      }

      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        costCenter: formData.costCenter,
        jobTitle: formData.jobTitle.trim() || null,
        startDate: formData.startDate || null,
      };
      if (photoUrl !== undefined) {
        updateData.photoUrl = photoUrl;
      }

      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Aktualisieren");
      }
      setEditModalOpen(false);
      setEditingEmployee(null);
      setFormData(emptyForm);
      resetPhotoState();
      await fetchEmployees();
      window.dispatchEvent(new Event("employee-updated"));
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !employee.active }),
      });
      if (!res.ok) throw new Error("Fehler beim Statuswechsel");
      await fetchEmployees();
      window.dispatchEvent(new Event("employee-updated"));
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      costCenter: employee.costCenter,
      jobTitle: employee.jobTitle || "",
      startDate: employee.startDate ? employee.startDate.slice(0, 10) : "",
    });
    setPhotoPreview(employee.photoUrl || null);
    setPhotoFile(null);
    setEmpError(null);
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    resetPhotoState();
    setEmpError(null);
    setCreateModalOpen(true);
  };

  const removePhoto = async () => {
    if (!editingEmployee) return;
    try {
      await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: null }),
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      setEditingEmployee({ ...editingEmployee, photoUrl: null });
      await fetchEmployees();
      window.dispatchEvent(new Event("employee-updated"));
    } catch {
      setEmpError("Fehler beim Entfernen des Fotos");
    }
  };

  // ── Audit Logic ──
  useEffect(() => {
    if (status !== "authenticated") return;
    setAuditLoading(true);
    const params = new URLSearchParams({ page: String(auditPage), limit: "50" });
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);

    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then(setAuditData)
      .finally(() => setAuditLoading(false));
  }, [status, auditPage, actionFilter, entityFilter]);

  // ── Benutzer Logic ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setUsers(await res.json());
    } catch {
      setUserError("Benutzer konnten nicht geladen werden.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchUsers();
  }, [status, fetchUsers]);

  const handleUserCreate = async () => {
    if (!userFormData.name.trim() || !userFormData.email.trim() || !userFormData.password) {
      setUserError("Alle Felder sind erforderlich.");
      return;
    }
    if (userFormData.password !== userFormData.passwordConfirm) {
      setUserError("Passwörter stimmen nicht überein.");
      return;
    }
    if (userFormData.password.length < 6) {
      setUserError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    setUserSaving(true);
    setUserError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userFormData.name.trim(),
          email: userFormData.email.trim(),
          password: userFormData.password,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Erstellen");
      }
      const newUser = await res.json();

      // Upload photo if selected
      if (userPhotoFile) {
        const photoUrl = await uploadUserPhoto();
        if (photoUrl) {
          await fetch(`/api/users/${newUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoUrl }),
          });
        }
      }

      setUserCreateModalOpen(false);
      setUserFormData(emptyUserForm);
      resetUserPhotoState();
      await fetchUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setUserSaving(false);
    }
  };

  const handleUserEdit = async () => {
    if (!editingUser) return;
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      setUserError("Name und E-Mail sind erforderlich.");
      return;
    }
    if (userFormData.password && userFormData.password !== userFormData.passwordConfirm) {
      setUserError("Passwörter stimmen nicht überein.");
      return;
    }
    if (userFormData.password && userFormData.password.length < 6) {
      setUserError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    setUserSaving(true);
    setUserError(null);
    try {
      const updateData: Record<string, unknown> = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim(),
      };
      if (userFormData.password) {
        updateData.password = userFormData.password;
      }
      // Upload photo if new one selected
      if (userPhotoFile) {
        const photoUrl = await uploadUserPhoto();
        if (photoUrl) updateData.photoUrl = photoUrl;
      }
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Aktualisieren");
      }
      // Refresh session if editing own account
      if (editingUser.id === session?.user?.id) {
        await updateSession();
      }
      setUserEditModalOpen(false);
      setEditingUser(null);
      setUserFormData(emptyUserForm);
      resetUserPhotoState();
      await fetchUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setUserSaving(false);
    }
  };

  const handleUserDelete = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Löschen");
      }
      await fetchUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  };

  const openUserEditModal = (user: UserItem) => {
    setEditingUser(user);
    setUserFormData({ name: user.name, email: user.email, password: "", passwordConfirm: "" });
    setUserPhotoPreview(user.photoUrl || null);
    setUserPhotoFile(null);
    setUserError(null);
    setUserEditModalOpen(true);
  };

  const resetUserPhotoState = () => {
    setUserPhotoPreview(null);
    setUserPhotoFile(null);
    if (userFileInputRef.current) userFileInputRef.current.value = "";
  };

  const handleUserPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) { setUserError("Nur JPG, PNG, WebP und GIF sind erlaubt."); return; }
    if (file.size > 5 * 1024 * 1024) { setUserError("Datei darf maximal 5MB groß sein."); return; }
    setUserPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUserPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadUserPhoto = async (): Promise<string | null> => {
    if (!userPhotoFile) return null;
    try {
      const fd = new FormData();
      fd.append("file", userPhotoFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
      const { url } = await res.json();
      return url;
    } catch { return null; }
  };

  const openUserCreateModal = () => {
    setUserFormData(emptyUserForm);
    resetUserPhotoState();
    setUserError(null);
    setUserCreateModalOpen(true);
  };

  // ── Loading / unauth guard ──
  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." className="min-h-screen" />;
  }

  // ── Photo upload UI component ──
  const PhotoUploadSection = ({ isEdit }: { isEdit: boolean }) => {
    const currentPhoto = isEdit ? (photoPreview || editingEmployee?.photoUrl) : photoPreview;
    const initials = formData.name
      ? formData.name.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2)
      : "?";

    return (
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Foto"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg ring-2 ring-gray-200">
              {initials}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Foto {currentPhoto ? "ändern" : "hochladen"}
          </button>
          {currentPhoto && isEdit && (
            <button
              type="button"
              onClick={removePhoto}
              className="text-[11px] text-red-500 hover:text-red-700 transition-colors text-left"
            >
              Foto entfernen
            </button>
          )}
          <p className="text-[10px] text-gray-400">JPG, PNG, WebP oder GIF (max. 5MB)</p>
        </div>
      </div>
    );
  };

  // ── Render ──
  return (
    <AppShell pageTitle="Einstellungen">
      <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} className="mb-6" />

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Mitarbeiter
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "mitarbeiter" && (
        <>
          {/* Filters and Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                options={FILTER_COST_CENTER_OPTIONS}
                value={filterCostCenter}
                onChange={(e) => setFilterCostCenter(e.target.value)}
                className="w-48"
              />
              <Select
                options={FILTER_STATUS_OPTIONS}
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={openCreateModal}>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neuer Mitarbeiter
            </Button>
          </div>

          {/* Error message */}
          {empError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {empError}
              <button onClick={() => setEmpError(null)} className="ml-3 font-medium underline hover:text-red-900">
                Schließen
              </button>
            </div>
          )}

          {/* Table */}
          {empLoading ? (
            <SkeletonTable rows={4} cols={5} />
          ) : employees.length === 0 ? (
            <EmptyState
              icon="users"
              title="Keine Mitarbeiter gefunden"
              description="Legen Sie den ersten Mitarbeiter an, um KPI-Daten zu erfassen."
              action={{ label: "Mitarbeiter anlegen", onClick: openCreateModal }}
            />
          ) : (
            <Card className="overflow-hidden !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 font-medium text-gray-600">Mitarbeiter</th>
                      <th className="px-6 py-3 font-medium text-gray-600">Kostenstelle</th>
                      <th className="px-6 py-3 font-medium text-gray-600">Status</th>
                      <th className="px-6 py-3 font-medium text-gray-600 text-right">KPI-Einträge</th>
                      <th className="px-6 py-3 font-medium text-gray-600 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => {
                      const initials = emp.name.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => router.push(`/mitarbeiter/${emp.id}`)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={emp.name} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
                                  {initials}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={kstColor(emp.costCenter)}>KST {emp.costCenter}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={emp.active ? "green" : "red"}>
                              {emp.active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">{emp._count.kpiEntries}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(emp)}>
                                Bearbeiten
                              </Button>
                              <Button
                                variant={emp.active ? "secondary" : "primary"}
                                size="sm"
                                onClick={() => setConfirmState({ employee: emp, action: emp.active ? "deactivate" : "activate" })}
                              >
                                {emp.active ? "Deaktivieren" : "Aktivieren"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Create Modal */}
          <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); resetPhotoState(); }} title="Neuer Mitarbeiter">
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <PhotoUploadSection isEdit={false} />
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                required
              />
              <Select
                label="Kostenstelle"
                options={COST_CENTER_OPTIONS}
                value={formData.costCenter}
                onChange={(e) => setFormData((prev) => ({ ...prev, costCenter: e.target.value }))}
              />
              <Input
                label="Jobtitel"
                value={formData.jobTitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="z.B. Personaldisponent"
              />
              <Input
                label="Startdatum"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetPhotoState(); }}>
                  Abbrechen
                </Button>
                <Button type="submit" loading={saving || uploadingPhoto}>
                  Erstellen
                </Button>
              </div>
            </form>
          </Modal>

          {/* Edit Modal */}
          <Modal
            isOpen={editModalOpen}
            onClose={() => { setEditModalOpen(false); setEditingEmployee(null); resetPhotoState(); }}
            title="Mitarbeiter bearbeiten"
          >
            <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-4">
              <PhotoUploadSection isEdit={true} />
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                required
              />
              <Select
                label="Kostenstelle"
                options={COST_CENTER_OPTIONS}
                value={formData.costCenter}
                onChange={(e) => setFormData((prev) => ({ ...prev, costCenter: e.target.value }))}
              />
              <Input
                label="Jobtitel"
                value={formData.jobTitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="z.B. Personaldisponent"
              />
              <Input
                label="Startdatum"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingEmployee(null); resetPhotoState(); }}>
                  Abbrechen
                </Button>
                <Button type="submit" loading={saving || uploadingPhoto}>
                  Speichern
                </Button>
              </div>
            </form>
          </Modal>

          {/* Confirm Dialog */}
          <ConfirmDialog
            isOpen={!!confirmState}
            onClose={() => setConfirmState(null)}
            onConfirm={async () => {
              if (confirmState) {
                await handleToggleActive(confirmState.employee);
                setConfirmState(null);
              }
            }}
            title={confirmState?.action === "deactivate" ? "Mitarbeiter deaktivieren?" : "Mitarbeiter aktivieren?"}
            description={
              confirmState?.action === "deactivate"
                ? `Möchten Sie "${confirmState?.employee.name}" wirklich deaktivieren? Der Mitarbeiter wird nicht mehr in den Auswertungen angezeigt.`
                : `Möchten Sie "${confirmState?.employee.name}" wieder aktivieren?`
            }
            variant={confirmState?.action === "deactivate" ? "danger" : "warning"}
            confirmLabel={confirmState?.action === "deactivate" ? "Deaktivieren" : "Aktivieren"}
          />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Audit-Log
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setAuditPage(1); }}
              className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Alle Aktionen</option>
              <option value="create">Erstellt</option>
              <option value="update">Aktualisiert</option>
              <option value="delete">Gelöscht</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setAuditPage(1); }}
              className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Alle Typen</option>
              <option value="KpiEntry">KPI-Eintrag</option>
              <option value="Employee">Mitarbeiter</option>
            </select>

            {auditData && (
              <span className="text-sm text-gray-400 ml-auto self-center">
                {auditData.total} Einträge
              </span>
            )}
          </div>

          {auditLoading ? (
            <SkeletonTable rows={8} cols={5} />
          ) : auditData && auditData.logs.length > 0 ? (
            <>
              <Card className="overflow-hidden !p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 font-medium text-gray-600">Zeitpunkt</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Aktion</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Typ</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Entity-ID</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditData.logs.map((log) => {
                        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                        let changesPreview = "";
                        try {
                          const parsed = JSON.parse(log.changes);
                          const keys = Object.keys(parsed);
                          changesPreview = keys.slice(0, 4).join(", ");
                          if (keys.length > 4) changesPreview += "...";
                        } catch {
                          changesPreview = log.changes.slice(0, 60);
                        }

                        return (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap text-xs">
                              {new Date(log.createdAt).toLocaleString("de-DE")}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${actionInfo.color}`}>
                                {actionInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs">
                              {ENTITY_LABELS[log.entityType] || log.entityType}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                              {log.entityId.slice(0, 12)}...
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[300px] truncate" title={log.changes}>
                              {changesPreview}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination */}
              {auditData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="secondary" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                    Zurück
                  </Button>
                  <span className="text-sm text-gray-500">Seite {auditPage} von {auditData.totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={auditPage >= auditData.totalPages} onClick={() => setAuditPage((p) => p + 1)}>
                    Weiter
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="document"
              title="Keine Einträge gefunden"
              description="Passen Sie die Filter an, um Audit-Log-Einträge anzuzeigen."
              compact
            />
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Benutzer
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "benutzer" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Benutzer verwalten und neue Zugänge anlegen.</p>
            </div>
            <Button onClick={openUserCreateModal}>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neuer Benutzer
            </Button>
          </div>

          {userError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {userError}
              <button onClick={() => setUserError(null)} className="ml-3 font-medium underline hover:text-red-900">
                Schließen
              </button>
            </div>
          )}

          {usersLoading ? (
            <SkeletonTable rows={2} cols={4} />
          ) : users.length === 0 ? (
            <EmptyState icon="users" title="Keine Benutzer gefunden" description="Legen Sie den ersten Benutzer an." action={{ label: "Benutzer anlegen", onClick: openUserCreateModal }} />
          ) : (
            <Card className="overflow-hidden !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 font-medium text-gray-600">Name</th>
                      <th className="px-6 py-3 font-medium text-gray-600">E-Mail</th>
                      <th className="px-6 py-3 font-medium text-gray-600">Rolle</th>
                      <th className="px-6 py-3 font-medium text-gray-600 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                      const isMe = session?.user?.id === user.id;
                      return (
                        <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
                                  {user.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{user.name}</span>
                              {isMe && <Badge color="blue">Mein Konto</Badge>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <Badge color="gray">{user.role === "admin" ? "Administrator" : user.role}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openUserEditModal(user)}>
                                Bearbeiten
                              </Button>
                              {!isMe && (
                                <Button variant="secondary" size="sm" onClick={() => setUserDeleteConfirm(user)}>
                                  Löschen
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Create User Modal */}
          <Modal isOpen={userCreateModalOpen} onClose={() => { setUserCreateModalOpen(false); resetUserPhotoState(); }} title="Neuer Benutzer">
            <form onSubmit={(e) => { e.preventDefault(); handleUserCreate(); }} className="space-y-4">
              {/* Photo */}
              <div className="flex items-center gap-4">
                {userPhotoPreview ? (
                  <img src={userPhotoPreview} alt="Foto" className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-200" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg ring-2 ring-gray-200">
                    {userFormData.name ? userFormData.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2) : "?"}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <input ref={userFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUserPhotoSelect} className="hidden" />
                  <button type="button" onClick={() => userFileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                    Foto {userPhotoPreview ? "ändern" : "hochladen"}
                  </button>
                  <p className="text-[10px] text-gray-400">JPG, PNG, WebP oder GIF (max. 5MB)</p>
                </div>
              </div>
              <Input
                label="Name"
                value={userFormData.name}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                required
              />
              <Input
                label="E-Mail"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="benutzer@hanseaten.de"
                required
              />
              <Input
                label="Passwort"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Mindestens 6 Zeichen"
                required
              />
              <Input
                label="Passwort bestätigen"
                type="password"
                value={userFormData.passwordConfirm}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
                placeholder="Passwort wiederholen"
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setUserCreateModalOpen(false)}>Abbrechen</Button>
                <Button type="submit" loading={userSaving}>Erstellen</Button>
              </div>
            </form>
          </Modal>

          {/* Edit User Modal */}
          <Modal isOpen={userEditModalOpen} onClose={() => { setUserEditModalOpen(false); setEditingUser(null); resetUserPhotoState(); }} title="Benutzer bearbeiten">
            <form onSubmit={(e) => { e.preventDefault(); handleUserEdit(); }} className="space-y-4">
              {/* Photo */}
              <div className="flex items-center gap-4">
                {(userPhotoPreview || editingUser?.photoUrl) ? (
                  <img src={userPhotoPreview || editingUser?.photoUrl || ""} alt="Foto" className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-200" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg ring-2 ring-gray-200">
                    {userFormData.name ? userFormData.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2) : "?"}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <input ref={userFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUserPhotoSelect} className="hidden" />
                  <button type="button" onClick={() => userFileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                    Foto {(userPhotoPreview || editingUser?.photoUrl) ? "ändern" : "hochladen"}
                  </button>
                  <p className="text-[10px] text-gray-400">JPG, PNG, WebP oder GIF (max. 5MB)</p>
                </div>
              </div>
              <Input
                label="Name"
                value={userFormData.name}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                required
              />
              <Input
                label="E-Mail"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="benutzer@hanseaten.de"
                required
              />
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-xs text-gray-400 mb-3">Passwort ändern (leer lassen um das Passwort beizubehalten)</p>
                <div className="space-y-4">
                  <Input
                    label="Neues Passwort"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Neues Passwort eingeben"
                  />
                  {userFormData.password && (
                    <Input
                      label="Passwort bestätigen"
                      type="password"
                      value={userFormData.passwordConfirm}
                      onChange={(e) => setUserFormData((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
                      placeholder="Neues Passwort wiederholen"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setUserEditModalOpen(false); setEditingUser(null); }}>Abbrechen</Button>
                <Button type="submit" loading={userSaving}>Speichern</Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirm */}
          <ConfirmDialog
            isOpen={!!userDeleteConfirm}
            onClose={() => setUserDeleteConfirm(null)}
            onConfirm={async () => {
              if (userDeleteConfirm) {
                await handleUserDelete(userDeleteConfirm);
                setUserDeleteConfirm(null);
              }
            }}
            title="Benutzer löschen?"
            description={`Möchten Sie den Benutzer "${userDeleteConfirm?.name}" (${userDeleteConfirm?.email}) wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
            variant="danger"
            confirmLabel="Löschen"
          />
        </>
      )}
    </AppShell>
  );
}
