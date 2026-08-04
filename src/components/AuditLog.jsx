import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ShieldAlert,
  History,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Pencil,
  RotateCcw,
  Trash2,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase"; // adjust path if your client lives elsewhere

const PAGE_SIZE = 25;

const ACTIONS = [
  { value: "insert", label: "Created", icon: PlusCircle, tone: "text-emerald-400" },
  { value: "update", label: "Updated", icon: Pencil, tone: "text-blue-400" },
  { value: "void", label: "Voided", icon: RotateCcw, tone: "text-amber-400" },
  { value: "delete", label: "Deleted", icon: Trash2, tone: "text-[var(--danger)]" },
];

const TABLES = ["sales", "expenses", "schedules", "inventory"];

function actionMeta(action) {
  return ACTIONS.find((a) => a.value === action) || ACTIONS[1];
}

function formatDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Diff a before/after pair down to the fields that actually changed.
function diffFields(before, after) {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  const skip = new Set(["updated_at", "created_by", "updated_by"]);
  const rows = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const a = before ? before[key] : undefined;
    const b = after ? after[key] : undefined;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      rows.push({ key, before: a, after: b });
    }
  }
  return rows;
}

function displayValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AuditLog({ branch, staff }) {
  const isOwner = staff?.role === "owner";
  // Owners can be branch-less (all-branch access) -- staff.branch_id is null in that case.
  const isAllBranch = isOwner && !staff?.branch_id;

  const [branches, setBranches] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [branchMap, setBranchMap] = useState({});

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    branchId: isAllBranch ? "" : branch?.id || "",
    action: "",
    table: "",
    from: "",
    to: "",
  });

  // Lookups: branches (for the filter + label map) and staff (for actor names).
  useEffect(() => {
    if (!isOwner) return;

    async function loadLookups() {
      const [{ data: branchRows }, { data: staffRows }] = await Promise.all([
        supabase.from("branches").select("id, name"),
        supabase.from("staff_public").select("id, name"),
      ]);

      setBranches(branchRows || []);
      setBranchMap(Object.fromEntries((branchRows || []).map((b) => [b.id, b.name])));
      setStaffMap(Object.fromEntries((staffRows || []).map((s) => [s.id, s.name])));
    }

    loadLookups();
  }, [isOwner]);

  const fetchPage = useCallback(
    async (offset, replace) => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (filters.branchId) query = query.eq("branch_id", filters.branchId);
      if (filters.action) query = query.eq("action", filters.action);
      if (filters.table) query = query.eq("table_name", filters.table);
      if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
      if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

      const { data, error } = await query;
      if (error) {
        console.error("Failed to load audit log:", error);
        return [];
      }

      setRows((prev) => (replace ? data || [] : [...prev, ...(data || [])]));
      setHasMore((data || []).length === PAGE_SIZE);
      return data || [];
    },
    [filters]
  );

  useEffect(() => {
    if (!isOwner) return;
    setLoading(true);
    setExpanded(null);
    fetchPage(0, true).finally(() => setLoading(false));
  }, [isOwner, fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchPage(rows.length, false);
    setLoadingMore(false);
  }

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      branchId: isAllBranch ? "" : branch?.id || "",
      action: "",
      table: "",
      from: "",
      to: "",
    });
  }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isAllBranch && filters.branchId) n++;
    if (filters.action) n++;
    if (filters.table) n++;
    if (filters.from) n++;
    if (filters.to) n++;
    return n;
  }, [filters, isAllBranch]);

  // --- Access gate -------------------------------------------------------
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--chip-bg)] flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 text-[var(--text-3)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-1)] mb-1">
          Owner access only
        </h2>
        <p className="text-sm text-[var(--text-3)] max-w-xs">
          The audit log records every change across the app. Ask an owner if
          you need something looked up here.
        </p>
      </div>
    );
  }

  // --- Main view -----------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)] flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--text-3)]" />
            Audit log
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            {isAllBranch ? "Every branch" : branch?.name} · every insert,
            update, void, and delete
          </p>
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? "border-purple-500/30 bg-purple-500/10 text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--chip-bg)]"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {isAllBranch && (
            <select
              value={filters.branchId}
              onChange={(e) => updateFilter("branchId", e.target.value)}
              className="bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)]"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filters.action}
            onChange={(e) => updateFilter("action", e.target.value)}
            className="bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)]"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          <select
            value={filters.table}
            onChange={(e) => updateFilter("table", e.target.value)}
            className="bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)]"
          >
            <option value="">All records</option>
            {TABLES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)]"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)]"
          />

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-3)]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[var(--text-3)]">
            No activity matches these filters yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const meta = actionMeta(row.action);
            const Icon = meta.icon;
            const isOpen = expanded === row.id;
            const changes = diffFields(row.before, row.after);
            const actorName = staffMap[row.staff_id] || "Unknown";
            const branchName = branchMap[row.branch_id] || "Unknown branch";

            return (
              <div
                key={row.id}
                className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--chip-bg)] transition-colors"
                >
                  <div className={`w-8 h-8 rounded-xl bg-[var(--chip-bg)] flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-1)] truncate">
                      {meta.label} · {row.table_name}
                      {isAllBranch && (
                        <span className="text-[var(--text-3)] font-normal"> · {branchName}</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-3)] truncate">
                      {actorName} · {formatDateTime(row.created_at)}
                      {row.reason ? ` · "${row.reason}"` : ""}
                    </p>
                  </div>

                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                    {row.reason && (
                      <p className="text-xs text-[var(--text-3)] mt-3 mb-2">
                        Reason:{" "}
                        <span className="text-[var(--text-2)]">{row.reason}</span>
                      </p>
                    )}

                    {changes.length === 0 ? (
                      <p className="text-xs text-[var(--text-3)] mt-3">
                        No field-level changes recorded.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-1.5">
                        {changes.map((c) => (
                          <div
                            key={c.key}
                            className="grid grid-cols-[100px_1fr_auto_1fr] items-center gap-2 text-xs"
                          >
                            <span className="text-[var(--text-3)] truncate">{c.key}</span>
                            <span className="text-[var(--text-2)] truncate line-through decoration-[var(--danger)]/50">
                              {displayValue(c.before)}
                            </span>
                            <span className="text-[var(--text-3)]">→</span>
                            <span className="text-[var(--text-1)] truncate">
                              {displayValue(c.after)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-[var(--text-3)] mt-3">
                      Record ID: {row.record_id}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--chip-bg)] transition-colors disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
