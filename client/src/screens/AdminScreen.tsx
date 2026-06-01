/**
 * client/src/screens/AdminScreen.tsx
 *
 * Admin console for ReadShift.
 * Features:
 *  - Passage table with full-text viewer modal (click row to open)
 *  - Status/domain filters, inline status controls
 *  - Refresh button that doesn't flicker on every action
 *  - Per-user passage history with Re-allow (reset seen) capability
 *  - Admin role toggle
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/shared/Button";
import { useUserStore } from "@/store";
import { apiClient } from "@/lib/apiClient";
import { DOMAINS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PassageStatus = "draft" | "ready" | "flagged" | "retired";

type AdminPassage = {
  id: string;
  domain: string;
  source: string;
  status: PassageStatus;
  quality_score: number | null;
  flagged: boolean;
  word_count: number;
  topic_key: string | null;
  created_at: string;
  body: string;
  _count: { questions: number; sessions: number };
};

type AdminUser = {
  id: string;
  email: string;
  is_admin: boolean;
  streak_days: number;
  created_at: string;
  _count?: { passageViews: number; sessions: number };
};

type SeenPassage = {
  seen_at: string;
  passage: {
    id: string;
    body: string;
    domain: string;
    status: string;
    quality_score: number | null;
    word_count: number;
    topic_key: string | null;
    flagged: boolean;
    source: string;
    created_at: string;
  };
  completed_session: {
    actual_wpm: number;
    comprehension: number;
  } | null;
};

type UserSeenData = {
  user: { id: string; email: string };
  seen_count: number;
  seen_passages: SeenPassage[];
};

// ── Status badge colours ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<PassageStatus | string, string> = {
  ready:   "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20",
  draft:   "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  flagged: "bg-red-500/20 text-red-300 border border-red-500/20",
  retired: "bg-slate-500/20 text-slate-400 border border-white/10",
};

function qualityColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-amber-400";
  return "text-red-400";
}

// ── Passage Viewer Modal ───────────────────────────────────────────────────────

function PassageModal({
  passage,
  onClose,
  onUpdate,
}: {
  passage: AdminPassage;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<AdminPassage, "status" | "flagged">>) => Promise<void>;
}) {
  const [mutating, setMutating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passage.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleAction = async (patch: Partial<Pick<AdminPassage, "status" | "flagged">>) => {
    setMutating(true);
    await onUpdate(passage.id, patch);
    setMutating(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-[#0d1527] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/8">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[passage.status])}>
                {passage.status}
              </span>
              <span className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/8 truncate max-w-[260px]">
                {passage.id}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
              <span className="font-bold capitalize">{passage.domain}</span>
              <span>·</span>
              <span>{passage.word_count} words</span>
              <span>·</span>
              <span>{passage._count.sessions} sessions</span>
              {passage.quality_score !== null && (
                <>
                  <span>·</span>
                  <span className={cn("font-bold", qualityColor(passage.quality_score))}>
                    Q: {passage.quality_score}/100
                  </span>
                </>
              )}
            </div>
            {passage.topic_key && (
              <p className="text-[11px] text-slate-500 font-mono">{passage.topic_key}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-white text-xl font-bold leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-slate-200 leading-relaxed text-sm font-serif space-y-4 select-text">
            {passage.body.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/8 flex flex-wrap gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="border border-white/10 text-indigo-300 hover:text-indigo-200 mr-auto"
            onClick={handleCopy}
          >
            {copied ? "✓ Copied!" : "📋 Copy Text"}
          </Button>
          {passage.status !== "ready" && (
            <Button
              size="sm"
              variant="secondary"
              isLoading={mutating}
              onClick={() => handleAction({ status: "ready", flagged: false })}
            >
              ✅ Mark Ready
            </Button>
          )}
          {passage.status !== "draft" && (
            <Button
              size="sm"
              variant="ghost"
              isLoading={mutating}
              onClick={() => handleAction({ status: "draft", flagged: false })}
            >
              📝 Draft
            </Button>
          )}
          {passage.status !== "retired" && (
            <Button
              size="sm"
              variant="ghost"
              isLoading={mutating}
              onClick={() => handleAction({ status: "retired", flagged: false })}
            >
              🗃 Retire
            </Button>
          )}
          {passage.status !== "flagged" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              isLoading={mutating}
              onClick={() => handleAction({ status: "flagged", flagged: true })}
            >
              🚩 Flag
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── User Seen Passages Panel ───────────────────────────────────────────────────

function UserSeenPanel({
  user,
  onReset,
}: {
  user: AdminUser;
  onReset: (userId: string, passageId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<UserSeenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = async () => {
    if (data) { setOpen(true); return; }
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: UserSeenData }>(`/admin/users/${user.id}/seen-passages`);
      setData(res.data.data);
      setOpen(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (passageId: string) => {
    setResettingId(passageId);
    await onReset(user.id, passageId);
    // Remove from local state immediately
    setData((prev) =>
      prev
        ? {
            ...prev,
            seen_count: prev.seen_count - 1,
            seen_passages: prev.seen_passages.filter((s) => s.passage.id !== passageId),
          }
        : prev
    );
    setResettingId(null);
  };

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 py-2.5 px-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 font-medium truncate">{user.email}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {user.streak_days}🔥 ·{" "}
            {user._count?.sessions ?? 0} Completed ·{" "}
            {Math.max(0, (user._count?.passageViews ?? 0) - (user._count?.sessions ?? 0))} Unfinished ·{" "}
            {user._count?.passageViews ?? 0} Seen
          </p>
        </div>
        <button
          onClick={open ? () => setOpen(false) : load}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap flex items-center gap-1.5"
        >
          {loading ? (
            <span className="animate-spin text-indigo-400">⟳</span>
          ) : open ? (
            "▲ Hide History"
          ) : (
            "▼ Show History"
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-2 pr-1">
              {data.seen_passages.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No passages assigned to this user yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {data.seen_passages.map((sp) => (
                    <div
                      key={sp.passage.id}
                      className="flex items-start gap-3 bg-white/3 border border-white/6 rounded-xl px-3 py-2"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {sp.passage.id.slice(0, 8)}…
                          </span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", STATUS_COLORS[sp.passage.status as PassageStatus] ?? STATUS_COLORS.retired)}>
                            {sp.passage.status}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">{sp.passage.domain}</span>
                          {sp.passage.flagged && (
                            <span className="text-[10px] text-red-400 font-bold">🚩 flagged</span>
                          )}
                          {sp.completed_session ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                              ✓ Completed ({sp.completed_session.actual_wpm} WPM · {sp.completed_session.comprehension}/3 correct)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15">
                              ✗ Unfinished / Abandoned
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {sp.passage.body.slice(0, 120)}…
                        </p>
                        <p className="text-[10px] text-slate-600">
                          Seen: {new Date(sp.seen_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleReset(sp.passage.id)}
                        disabled={resettingId === sp.passage.id}
                        title="Re-allow this passage for this user (removes seen record)"
                        className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-40 whitespace-nowrap"
                      >
                        {resettingId === sp.passage.id ? "…" : "↺ Re-allow"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main AdminScreen ───────────────────────────────────────────────────────────

export default function AdminScreen() {
  const user = useUserStore((s) => s.user);

  // Data state
  const [refreshing, setRefreshing] = useState(false); // only for the top Refresh button
  const [loading, setLoading] = useState(true);        // initial load
  const [error, setError] = useState<string | null>(null);
  const [passages, setPassages] = useState<AdminPassage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Filters
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sorting
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Viewer modal
  const [selectedPassage, setSelectedPassage] = useState<AdminPassage | null>(null);

  const handleHeaderSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const isAdmin = !!user?.is_admin;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [passRes, userRes] = await Promise.all([
          apiClient.get<{ data: { passages: AdminPassage[] } }>("/admin/passages", {
            params: {
              limit: 60,
              ...(domainFilter !== "all" ? { domain: domainFilter } : {}),
              ...(statusFilter !== "all" ? { status: statusFilter } : {}),
              sortBy,
              sortOrder,
            },
          }),
          apiClient.get<{ data: AdminUser[] }>("/admin/users"),
        ]);
        setPassages(passRes.data.data.passages);
        setUsers(userRes.data.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load admin data");
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [domainFilter, statusFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    if (isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, domainFilter, statusFilter, sortBy, sortOrder]);

  // ── Status counts ──────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, ready: 0, flagged: 0, retired: 0 };
    passages.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return counts;
  }, [passages]);

  // ── Mutations (do NOT touch the Refresh button loading state) ─────────────

  const updatePassage = async (
    id: string,
    patch: Partial<Pick<AdminPassage, "status" | "flagged" | "quality_score">>
  ) => {
    try {
      await apiClient.patch(`/admin/passages/${id}`, patch);
      // Update local state directly — NO full fetchData() to prevent Refresh flicker
      setPassages((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                flagged: patch.flagged ?? (patch.status === "flagged" ? true : patch.status ? false : p.flagged),
              }
            : p
        )
      );
      // Update selected passage modal state if currently active
      setSelectedPassage((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          ...patch,
          flagged: patch.flagged ?? (patch.status === "flagged" ? true : patch.status ? false : prev.flagged),
        };
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update passage");
    }
  };

  const toggleAdmin = async (targetUser: AdminUser) => {
    try {
      await apiClient.patch(`/admin/users/${targetUser.id}`, { is_admin: !targetUser.is_admin });
      // Update local state directly
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: !u.is_admin } : u))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user role");
    }
  };

  const resetSeenPassage = async (userId: string, passageId: string) => {
    try {
      await apiClient.delete(`/admin/users/${userId}/seen-passages/${passageId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset seen passage");
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!user) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Passage viewer modal */}
      <AnimatePresence>
        {selectedPassage && (
          <PassageModal
            passage={selectedPassage}
            onClose={() => setSelectedPassage(null)}
            onUpdate={async (id, patch) => {
              await updatePassage(id, patch);
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white">Admin Console</h1>
              <p className="text-sm text-slate-400">
                Manage passage quality, user roles, and passage assignment history.
              </p>
            </div>
            <Button onClick={() => fetchData(true)} isLoading={refreshing}>
              ↺ Refresh
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ── Passage Controls ────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Passage Controls</h2>
              </div>
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
                <span className="text-slate-600">|</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200 font-semibold"
                >
                  <option value="created_at">Date Added</option>
                  <option value="quality_score">Quality Score</option>
                  <option value="sessions">Sessions Count</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Status count badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(["ready", "draft", "flagged", "retired"] as PassageStatus[]).map((status) => (
                <span
                  key={status}
                  className={cn("rounded-full px-3 py-1 font-semibold cursor-pointer transition-all", STATUS_COLORS[status])}
                  onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                >
                  {status}: {statusCounts[status] ?? 0}
                </span>
              ))}
            </div>

            {/* Passages table */}
            <div className={cn("overflow-x-auto transition-opacity duration-200", loading && "opacity-50 pointer-events-none")}>
              {passages.length === 0 && loading ? (
                <div className="text-center py-12 text-slate-500 text-sm animate-pulse">Loading passages…</div>
              ) : passages.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No passages match the current filters.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/10">
                      <th 
                        className="py-2 pr-4 cursor-pointer hover:text-white select-none transition-colors"
                        onClick={() => handleHeaderSort("created_at")}
                      >
                        Passage {sortBy === "created_at" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"} <span className="text-slate-600 font-normal text-xs">(click to open)</span>
                      </th>
                      <th className="py-2 pr-4">Domain / Level</th>
                      <th className="py-2 pr-4">Status</th>
                      <th 
                        className="py-2 pr-4 cursor-pointer hover:text-white select-none transition-colors"
                        onClick={() => handleHeaderSort("quality_score")}
                      >
                        Quality {sortBy === "quality_score" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </th>
                      <th 
                        className="py-2 pr-4 cursor-pointer hover:text-white select-none transition-colors"
                        onClick={() => handleHeaderSort("sessions")}
                      >
                        Sessions {sortBy === "sessions" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passages.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-white/5 align-top hover:bg-white/3 transition-colors group"
                      >
                        {/* Passage body — click to open modal */}
                        <td
                          className="py-2.5 pr-4 max-w-[28rem] cursor-pointer"
                          onClick={() => setSelectedPassage(p)}
                        >
                          <p className="line-clamp-2 text-slate-200 group-hover:text-white transition-colors text-sm leading-relaxed">
                            {p.body}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[10px] text-slate-600">{p.id.slice(0, 8)}…</span>
                            <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString()} · {p.source}</span>
                            <span className="text-[10px] text-indigo-500 group-hover:text-indigo-400 transition-colors font-semibold">
                              → View full
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                          <span className="capitalize">{p.domain}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={cn("text-xs rounded-full px-2 py-0.5 font-semibold", STATUS_COLORS[p.status])}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={cn("text-sm font-bold", qualityColor(p.quality_score))}>
                            {p.quality_score ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 text-sm">{p._count.sessions}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            {p.status !== "ready" && (
                              <button
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all whitespace-nowrap"
                                onClick={(e) => { e.stopPropagation(); updatePassage(p.id, { status: "ready", flagged: false }); }}
                              >
                                ✅ Ready
                              </button>
                            )}
                            {p.status !== "draft" && (
                              <button
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/6 border border-white/10 text-slate-300 hover:text-white transition-all whitespace-nowrap"
                                onClick={(e) => { e.stopPropagation(); updatePassage(p.id, { status: "draft", flagged: false }); }}
                              >
                                📝 Draft
                              </button>
                            )}
                            {p.status !== "retired" && (
                              <button
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/6 border border-white/10 text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                                onClick={(e) => { e.stopPropagation(); updatePassage(p.id, { status: "retired", flagged: false }); }}
                              >
                                🗃 Retire
                              </button>
                            )}
                            {p.status !== "flagged" && (
                              <button
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all whitespace-nowrap"
                                onClick={(e) => { e.stopPropagation(); updatePassage(p.id, { status: "flagged", flagged: true }); }}
                              >
                                🚩 Flag
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* ── User Passage History ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-3">
            <div>
              <h2 className="text-lg font-bold text-white">User Passage History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Expand any user to see all passages they have been assigned. Use ↺ Re-allow to remove a seen record and make that passage available to the user again.
              </p>
            </div>
            <div className="divide-y divide-white/5">
              {users.map((u) => (
                <UserSeenPanel
                  key={u.id}
                  user={u}
                  onReset={resetSeenPassage}
                />
              ))}
            </div>
          </section>

          {/* ── Admin Role Controls ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-4">
            <h2 className="text-lg font-bold text-white">Admin Role Controls</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Streak</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Admin</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-slate-200 max-w-[18rem] truncate">{u.email}</td>
                      <td className="py-2 pr-4 text-slate-300">{u.streak_days}🔥</td>
                      <td className="py-2 pr-4 text-slate-400">{u._count?.sessions ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                          u.is_admin ? "bg-indigo-500/20 text-indigo-300" : "bg-white/8 text-slate-400"
                        )}>
                          {u.is_admin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => toggleAdmin(u)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-lg border transition-all",
                            u.is_admin
                              ? "border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10"
                              : "border-indigo-500/20 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10"
                          )}
                        >
                          {u.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
