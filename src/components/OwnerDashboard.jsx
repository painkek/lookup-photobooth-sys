import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  RefreshCcw,
  Building2,
  ChevronLeft,
  Circle,
  Users,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";

/**
 * OwnerDashboard — cross-branch overview + per-branch drill-down.
 * Same CSS-variable theming / green accent as the staff Dashboard.
 */

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const CHART_THEMES = {
  dark: {
    text: "#94a3b8",
    grid: "rgba(255, 255, 255, 0.05)",
    tooltip: {
      contentStyle: {
        backgroundColor: "#121214",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        color: "#f1f5f9",
      },
      itemStyle: { color: "#f1f5f9" },
    },
  },
  light: {
    text: "#64748b",
    grid: "rgba(15, 23, 42, 0.06)",
    tooltip: {
      contentStyle: {
        backgroundColor: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.1)",
        borderRadius: "12px",
        color: "#0f172a",
      },
      itemStyle: { color: "#0f172a" },
    },
  },
};

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function isoDate(d) {
  return d.toISOString().split("T")[0];
}

function rangeStart(range) {
  const d = new Date();
  if (range === "today") return isoDate(d);
  if (range === "week") {
    d.setDate(d.getDate() - 6);
    return isoDate(d);
  }
  d.setDate(d.getDate() - 29); // rolling 30 days, matches the staff Dashboard's "month"
  return isoDate(d);
}

function peso(n) {
  return `₱${(n || 0).toLocaleString()}`;
}

export default function OwnerDashboard({ staff }) {
  const isDark = useIsDark();
  const CHART_THEME = isDark ? CHART_THEMES.dark : CHART_THEMES.light;

  const [range, setRange] = useState("month");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null); // null = All branches

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [rosterMap, setRosterMap] = useState({}); // branch_id -> staff_public rows
  const [shiftsToday, setShiftsToday] = useState([]); // today's shifts, all branches

  const from = useMemo(() => rangeStart(range), [range]);
  const today = useMemo(() => isoDate(new Date()), []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const todayStart = `${today}T00:00:00`;

      const [
        { data: branchRows },
        { data: saleRows },
        { data: expenseRows },
        { data: inventoryRows },
        { data: staffRows },
        { data: shiftRows },
      ] = await Promise.all([
        supabase.from("branches").select("id, name, code").order("name"),
        supabase
          .from("sales")
          .select("*")
          .gte("sale_date", from)
          .eq("is_deleted", false)
          .is("voided_at", null),
        supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", from)
          .eq("is_deleted", false)
          .is("voided_at", null),
        supabase.from("inventory").select("*").eq("is_deleted", false),
        supabase.from("staff_public").select("*"),
        supabase
          .from("shifts")
          .select("*")
          .gte("clock_in", todayStart)
          .order("clock_in", { ascending: false }),
      ]);

      setBranches(branchRows || []);
      setSales(saleRows || []);
      setExpenses(expenseRows || []);
      setInventory(inventoryRows || []);

      const roster = {};
      (staffRows || []).forEach((s) => {
        if (!roster[s.branch_id]) roster[s.branch_id] = [];
        roster[s.branch_id].push(s);
      });
      setRosterMap(roster);

      setShiftsToday(shiftRows || []);
    } catch (err) {
      console.error("Failed to load owner dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [from, today]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Derived, per-branch aggregates ------------------------------------
  const branchStats = useMemo(() => {
    return branches.map((b) => {
      const bSales = sales.filter((s) => s.branch_id === b.id);
      const bExpenses = expenses.filter((e) => e.branch_id === b.id);
      const revenue = bSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const spent = bExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const lowStock = inventory.filter(
        (i) => i.branch_id === b.id && i.quantity <= i.low_stock_threshold
      );
      return {
        ...b,
        revenue,
        expenses: spent,
        profit: revenue - spent,
        transactions: bSales.length,
        lowStockCount: lowStock.length,
      };
    });
  }, [branches, sales, expenses, inventory]);

  const totals = useMemo(
    () =>
      branchStats.reduce(
        (acc, b) => ({
          revenue: acc.revenue + b.revenue,
          expenses: acc.expenses + b.expenses,
          profit: acc.profit + b.profit,
          lowStockCount: acc.lowStockCount + b.lowStockCount,
        }),
        { revenue: 0, expenses: 0, profit: 0, lowStockCount: 0 }
      ),
    [branchStats]
  );

  const selectedBranch = branchStats.find((b) => b.id === selectedBranchId) || null;

  // Daily revenue / expenses / profit series for the chart, scoped to the
  // selected branch, or summed across all branches when none is selected.
  const dailySeries = useMemo(() => {
    const scope = selectedBranchId
      ? { sales: sales.filter((s) => s.branch_id === selectedBranchId), expenses: expenses.filter((e) => e.branch_id === selectedBranchId) }
      : { sales, expenses };

    const dayCount = range === "today" ? 1 : range === "week" ? 7 : 30;
    const days = [];
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = isoDate(d);
      const label =
        dayCount <= 7
          ? d.toLocaleDateString("en-US", { weekday: "short" })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayRevenue = scope.sales
        .filter((s) => s.sale_date === dateStr)
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const dayExpenses = scope.expenses
        .filter((e) => e.expense_date === dateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      days.push({
        day: label,
        revenue: dayRevenue,
        expenses: dayExpenses,
        profit: dayRevenue - dayExpenses,
      });
    }
    return days;
  }, [sales, expenses, selectedBranchId, range]);

  const lowStockList = useMemo(
    () =>
      inventory.filter(
        (i) =>
          i.quantity <= i.low_stock_threshold &&
          (selectedBranchId ? i.branch_id === selectedBranchId : true)
      ),
    [inventory, selectedBranchId]
  );

  // Today's shifts for the selected branch, newest first, with staff names
  // resolved from the roster (staff_public doesn't include shift data).
  const staffNameById = useMemo(() => {
    const map = {};
    Object.values(rosterMap)
      .flat()
      .forEach((s) => {
        map[s.id] = s;
      });
    return map;
  }, [rosterMap]);

  const branchShiftsToday = useMemo(
    () =>
      selectedBranchId
        ? shiftsToday.filter((sh) => sh.branch_id === selectedBranchId)
        : [],
    [shiftsToday, selectedBranchId]
  );

  function formatTime(ts) {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label;

  const StatCard = ({ title, value, icon: Icon, colorClass, formatted }) => (
    <div className="group relative overflow-hidden bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[var(--border-hover)]">
      <div
        className={`absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${colorClass}`}
      />
      <div className="relative flex justify-between items-start gap-2">
        <div className="flex flex-col min-h-[3.5rem] md:min-h-[4.25rem] min-w-0">
          <p className="text-[10px] md:text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
            {title}
          </p>
          <p className="text-xl md:text-2xl font-semibold text-[var(--text-1)] tracking-tight mt-auto truncate">
            {formatted}
          </p>
        </div>
        <div className="flex-shrink-0 p-2 md:p-2.5 rounded-xl border border-[var(--border)] bg-[var(--chip-bg)] text-[var(--text-2)] group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
    </div>
  );

  const CardHeader = ({ title, subtitle }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[var(--text-1)] tracking-tight">
        {title}
      </h3>
      {subtitle && <p className="text-xs text-[var(--text-3)]">{subtitle}</p>}
    </div>
  );

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-green-500/20 border-b-green-500 animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border border-green-500/10 blur-sm"></div>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Owner Overview
          </h2>
          <p className="text-[var(--text-2)]">
            {selectedBranch ? (
              <>
                <button
                  onClick={() => setSelectedBranchId(null)}
                  className="inline-flex items-center gap-1 text-[var(--accent)] font-medium hover:underline"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  All branches
                </button>
                {" · "}
                {selectedBranch.name} · {rangeLabel}
              </>
            ) : (
              <>
                Every branch ·{" "}
                <span className="text-[var(--accent)] font-medium">
                  {rangeLabel}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl p-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  range === r.value
                    ? "bg-[var(--panel-bg)] text-[var(--text-1)] shadow-sm"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-2)] hover:bg-[var(--chip-bg-hover)] hover:text-[var(--text-1)] transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats grid — totals for the current scope (all branches or the selected one) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Revenue"
          value={selectedBranch ? selectedBranch.revenue : totals.revenue}
          formatted={peso(selectedBranch ? selectedBranch.revenue : totals.revenue)}
          icon={TrendingUp}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Expenses"
          value={selectedBranch ? selectedBranch.expenses : totals.expenses}
          formatted={peso(selectedBranch ? selectedBranch.expenses : totals.expenses)}
          icon={TrendingDown}
          colorClass="bg-red-500"
        />
        <StatCard
          title="Profit"
          value={selectedBranch ? selectedBranch.profit : totals.profit}
          formatted={peso(selectedBranch ? selectedBranch.profit : totals.profit)}
          icon={DollarSign}
          colorClass={
            (selectedBranch ? selectedBranch.profit : totals.profit) >= 0
              ? "bg-emerald-500"
              : "bg-red-500"
          }
        />
        <StatCard
          title="Low stock items"
          value={selectedBranch ? selectedBranch.lowStockCount : totals.lowStockCount}
          formatted={String(
            selectedBranch ? selectedBranch.lowStockCount : totals.lowStockCount
          )}
          icon={AlertCircle}
          colorClass="bg-amber-500"
        />
      </div>

      {/* All-branches grid — click a card to drill in */}
      {!selectedBranch && (
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader title="Branches" subtitle="Tap a branch to drill in" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branchStats.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className="text-left p-4 rounded-2xl bg-[var(--inset-bg)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--border)]">
                      <Building2 className="w-3.5 h-3.5 text-[var(--text-2)]" />
                    </div>
                    <span className="font-semibold text-[var(--text-1)]">
                      {b.name}
                    </span>
                  </div>
                  {b.lowStockCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-[var(--warn)]">
                      {b.lowStockCount} low stock
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[var(--text-3)]">Revenue</p>
                    <p className="font-semibold text-[var(--success)]">{peso(b.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-3)]">Expenses</p>
                    <p className="font-semibold text-[var(--text-2)]">{peso(b.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-3)]">Profit</p>
                    <p
                      className={`font-semibold ${
                        b.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {peso(b.profit)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revenue / expenses / daily profit chart */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
        <CardHeader
          title="Revenue vs Expenses"
          subtitle={`Daily profit · ${rangeLabel.toLowerCase()}${
            selectedBranch ? ` · ${selectedBranch.name}` : " · all branches"
          }`}
        />
        <div className="h-[280px] md:h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailySeries}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={CHART_THEME.grid}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_THEME.text, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_THEME.text, fontSize: 12 }}
                tickFormatter={(v) => `₱${v}`}
              />
              <Tooltip
                contentStyle={CHART_THEME.tooltip.contentStyle}
                itemStyle={CHART_THEME.tooltip.itemStyle}
                formatter={(v) => peso(v)}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar
                dataKey="profit"
                name="Profit"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                fillOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                name="Revenue"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                name="Expenses"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low stock + shift roster — only meaningful once a branch is selected */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader
            title="Low stock alerts"
            subtitle={selectedBranch ? selectedBranch.name : "All branches"}
          />
          {lowStockList.length > 0 ? (
            <div className="space-y-2">
              {lowStockList.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-[var(--text-1)]">
                      {item.item_name}
                      {!selectedBranch && (
                        <span className="text-[var(--text-3)]">
                          {" "}
                          ·{" "}
                          {branches.find((b) => b.id === item.branch_id)?.name ||
                            "Unknown branch"}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--warn)]">
                    {item.quantity} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-3)] italic text-sm">
              Stock levels look fine
            </div>
          )}
        </div>

        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader
            title="Today's shifts"
            subtitle={
              selectedBranch
                ? "Green dot = still clocked in"
                : "Select a branch to see who's working"
            }
          />
          {!selectedBranch ? (
            <div className="text-center py-8 text-[var(--text-3)] italic text-sm flex flex-col items-center gap-2">
              <Users className="w-5 h-5 text-[var(--text-3)]" />
              Tap a branch above to see today's shifts
            </div>
          ) : branchShiftsToday.length > 0 ? (
            <div className="space-y-2">
              {branchShiftsToday.map((sh) => {
                const person = staffNameById[sh.staff_id];
                const isOpen = !sh.clock_out;
                return (
                  <div
                    key={sh.id}
                    className="flex justify-between items-center p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Circle
                        className={`w-2 h-2 ${
                          isOpen
                            ? "fill-emerald-500 text-emerald-500"
                            : "fill-[var(--text-3)]/30 text-[var(--text-3)]/30"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {person?.name || "Unknown"}
                        </p>
                        <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                          {person?.role || ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-2)] text-right">
                      {formatTime(sh.clock_in)}
                      {" – "}
                      {sh.clock_out ? (
                        formatTime(sh.clock_out)
                      ) : (
                        <span className="text-[var(--success)] font-medium">
                          now
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-3)] italic text-sm">
              No one's clocked in yet today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
