"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Loading } from "@/components/ui/loading";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  costCenter: string;
  active: boolean;
  createdAt: string;
  _count: { kpiEntries: number };
}

interface EmployeeFormData {
  name: string;
  email: string;
  costCenter: string;
}

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

const emptyForm: EmployeeFormData = { name: "", email: "", costCenter: "330" };

export default function MitarbeiterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [filterActive, setFilterActive] = useState("all");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCostCenter !== "all") params.set("costCenter", filterCostCenter);
      if (filterActive !== "all") params.set("active", filterActive);
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Fehler beim Laden der Mitarbeiter");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [filterCostCenter, filterActive]);

  useEffect(() => {
    if (status === "authenticated") fetchEmployees();
  }, [status, fetchEmployees]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.costCenter) {
      setError("Name und Kostenstelle sind erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          costCenter: formData.costCenter,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Erstellen");
      }
      setCreateModalOpen(false);
      setFormData(emptyForm);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingEmployee) return;
    if (!formData.name.trim() || !formData.costCenter) {
      setError("Name und Kostenstelle sind erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          costCenter: formData.costCenter,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Aktualisieren");
      }
      setEditModalOpen(false);
      setEditingEmployee(null);
      setFormData(emptyForm);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || "",
      costCenter: employee.costCenter,
    });
    setError(null);
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setError(null);
    setCreateModalOpen(true);
  };

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." className="min-h-screen" />;
  }

  return (
    <AppShell pageTitle="Mitarbeiter">
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
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neuer Mitarbeiter
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 font-medium underline hover:text-red-900"
          >
            Schliessen
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Loading text="Mitarbeiter werden geladen..." className="py-20" />
      ) : employees.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-sm">Keine Mitarbeiter gefunden.</p>
          <Button onClick={openCreateModal} variant="secondary" className="mt-4">
            Ersten Mitarbeiter anlegen
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-600">E-Mail</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Kostenstelle</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-600 text-right">
                    Anzahl KPI-Eintr&auml;ge
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-600 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/mitarbeiter/${emp.id}`)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.email || "\u2014"}</td>
                    <td className="px-6 py-4">
                      <Badge color="blue">KST {emp.costCenter}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={emp.active ? "green" : "red"}>
                        {emp.active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {emp._count.kpiEntries}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant={emp.active ? "secondary" : "primary"}
                          size="sm"
                          onClick={() => handleToggleActive(emp)}
                        >
                          {emp.active ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Neuer Mitarbeiter"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Vor- und Nachname"
            required
          />
          <Input
            label="E-Mail"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@beispiel.de"
          />
          <Select
            label="Kostenstelle"
            options={COST_CENTER_OPTIONS}
            value={formData.costCenter}
            onChange={(e) => setFormData((prev) => ({ ...prev, costCenter: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" loading={saving}>
              Erstellen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEmployee(null);
        }}
        title="Mitarbeiter bearbeiten"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit();
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Vor- und Nachname"
            required
          />
          <Input
            label="E-Mail"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@beispiel.de"
          />
          <Select
            label="Kostenstelle"
            options={COST_CENTER_OPTIONS}
            value={formData.costCenter}
            onChange={(e) => setFormData((prev) => ({ ...prev, costCenter: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditModalOpen(false);
                setEditingEmployee(null);
              }}
            >
              Abbrechen
            </Button>
            <Button type="submit" loading={saving}>
              Speichern
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
