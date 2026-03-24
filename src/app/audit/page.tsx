"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

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

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Erstellt", color: "bg-emerald-100 text-emerald-700" },
  update: { label: "Aktualisiert", color: "bg-blue-100 text-blue-700" },
  delete: { label: "Gelöscht", color: "bg-red-100 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  KpiEntry: "KPI-Eintrag",
  Employee: "Mitarbeiter",
};

export default function AuditPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);

    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [status, page, actionFilter, entityFilter]);

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." />;
  }

  return (
    <AppShell pageTitle="Audit-Log">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Alle Aktionen</option>
          <option value="create">Erstellt</option>
          <option value="update">Aktualisiert</option>
          <option value="delete">Gelöscht</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Alle Typen</option>
          <option value="KpiEntry">KPI-Eintrag</option>
          <option value="Employee">Mitarbeiter</option>
        </select>

        {data && (
          <span className="text-sm text-gray-400 ml-auto self-center">
            {data.total} Einträge
          </span>
        )}
      </div>

      {loading ? (
        <Loading text="Audit-Log wird geladen..." />
      ) : data && data.logs.length > 0 ? (
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
                  {data.logs.map((log) => {
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
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Zurück
              </Button>
              <span className="text-sm text-gray-500">
                Seite {page} von {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-sm">Keine Audit-Log-Einträge vorhanden.</p>
        </Card>
      )}
    </AppShell>
  );
}
