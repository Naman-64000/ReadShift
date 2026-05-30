import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "@/components/shared/Button";
import { useUserStore } from "@/store";
import { apiClient } from "@/lib/apiClient";
import { DOMAINS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PassageStatus = "draft" | "ready" | "flagged" | "retired";

type AdminPassage = {
  id: string;
  domain: string;
  level: number;
  source: string;
  status: PassageStatus;
  quality_score: number | null;
  flagged: boolean;
  created_at: string;
  body: string;
  _count: { questions: number; sessions: number };
};

type AdminUser = {
  id: string;
  email: string;
  is_admin: boolean;
  level: number;
  streak_days: number;
  created_at: string;
};

export default function AdminScreen() {
  const user = useUserStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passages, setPassages] = useState<AdminPassage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isAdmin = !!user?.is_admin;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [passRes, userRes] = await Promise.all([
        apiClient.get<{ data: { passages: AdminPassage[] } }>("/admin/passages", {
          params: {
            limit: 60,
            ...(domainFilter !== "all" ? { domain: domainFilter } : {}),
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          },
        }),
        apiClient.get<{ data: AdminUser[] }>("/admin/users"),
      ]);
      setPassages(passRes.data.data.passages);
      setUsers(userRes.data.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, domainFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, ready: 0, flagged: 0, retired: 0 };
    passages.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return counts;
  }, [passages]);

  const updatePassage = async (id: string, patch: Partial<Pick<AdminPassage, "status" | "flagged" | "quality_score">>) => {
    try {
      await apiClient.patch(`/admin/passages/${id}`, patch);
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update passage");
    }
  };

  const toggleAdmin = async (targetUser: AdminUser) => {
    try {
      await apiClient.patch(`/admin/users/${targetUser.id}`, { is_admin: !targetUser.is_admin });
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user role");
    }
  };

  if (!user) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-16 px-4 pb-16">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Admin Console</h1>
            <p className="text-sm text-slate-400">Manage passage quality status and admin roles without DB access.</p>
          </div>
          <Button onClick={fetchData} isLoading={loading}>Refresh</Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white">Passage Controls</h2>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200"
              >
                <option value="all">All Domains</option>
                {DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="draft">Draft</option>
                <option value="flagged">Flagged</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {(["ready", "draft", "flagged", "retired"] as PassageStatus[]).map((status) => (
              <span key={status} className="rounded-full bg-white/8 px-3 py-1 text-slate-300">
                {status}: {statusCounts[status] ?? 0}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-4">Passage</th>
                  <th className="py-2 pr-4">Domain/Level</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Quality</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {passages.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-4 max-w-[30rem] text-slate-200">
                      <p className="line-clamp-3">{p.body}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{new Date(p.created_at).toLocaleString()} • {p.source}</p>
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{p.domain} • L{p.level}</td>
                    <td className="py-2 pr-4">
                      <span className={cn(
                        "text-xs rounded-full px-2 py-1",
                        p.status === "ready" && "bg-emerald-500/20 text-emerald-300",
                        p.status === "draft" && "bg-amber-500/20 text-amber-300",
                        p.status === "flagged" && "bg-red-500/20 text-red-300",
                        p.status === "retired" && "bg-slate-500/20 text-slate-300"
                      )}>{p.status}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{p.quality_score ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => updatePassage(p.id, { status: "ready", flagged: false })}>Mark Ready</Button>
                        <Button size="sm" variant="ghost" onClick={() => updatePassage(p.id, { status: "draft", flagged: false })}>Draft</Button>
                        <Button size="sm" variant="ghost" onClick={() => updatePassage(p.id, { status: "retired", flagged: false })}>Retire</Button>
                        <Button size="sm" variant="ghost" className="text-red-300" onClick={() => updatePassage(p.id, { status: "flagged", flagged: true })}>Flag</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-4">
          <h2 className="text-lg font-bold text-white">Admin Role Controls</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Streak</th>
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-slate-200">{u.email}</td>
                    <td className="py-2 pr-4 text-slate-300">{u.level}</td>
                    <td className="py-2 pr-4 text-slate-300">{u.streak_days}</td>
                    <td className="py-2 pr-4 text-slate-300">{u.is_admin ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">
                      <Button size="sm" variant="secondary" onClick={() => toggleAdmin(u)}>
                        {u.is_admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
