import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
  Printer,
  ShoppingBag,
  RefreshCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";

/**
 * Dashboard Component — CSS-variable theming (green accent)
 * Mobile-optimized stat cards + charts.
 *
 * Module 1 role scoping:
 * - staff: dashboard QUERIES only today's rows (not just hides cards —
 *   the full history never reaches the browser). No weekly/monthly
 *   totals, no profit, no trend chart.
 * - manager/owner-if-landed-here: unchanged, full branch history.
 * - All roles: voided/deleted rows excluded from every total (bug fix —
 *   this file was never updated when Module 1 added void/delete).
 */
const COLORS = [
  "#22c55e", // Green
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#ef4444", // Red
];

// Recharts uses inline JS colors, so the chart theme is picked based
// on the current mode (watched via the .dark class on <html>).
const CHART_THEMES = {
  dark: {
    text: "#94a3b8",
    grid: "rgba(255, 255, 255, 0.05)",
    dotStroke: "#121214",
    pieStroke: "rgba(0,0,0,0.2)",
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
    dotStroke: "#ffffff",
    pieStroke: "rgba(255,255,255,0.8)",
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

// Watches the .dark class on <html> so charts re-render when the
// theme toggle in Layout flips it.
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

export default function Dashboard({ branch, staff }) {
  const isDark = useIsDark();
  const CHART_THEME = isDark ? CHART_THEMES.dark : CHART_THEMES.light;

  // Staff get a today-only dashboard — no branch-wide financial history
  // ever leaves the database for their session. Manager (and owner, if
  // they ever land on this component instead of the Owner Overview) get
  // the full picture, same as before.
  const isStaffView = staff?.role === "staff";

  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [weeklyPerformance, setWeeklyPerformance] = useState([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    todayExpenses: 0,
    weekExpenses: 0,
    monthExpenses: 0,
    totalTransactions: 0,
    totalErrors: 0,
    upcomingBookings: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    if (branch?.id) fetchDashboardData();
  }, [branch, isStaffView]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    try {
      // Bookings and inventory are small and operationally needed either way.
      const { data: bookings } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .eq("is_deleted", false)
        .is("voided_at", null)
        .neq("status", "cancelled");
      const { data: inventory } = await supabase
        .from("inventory")
        .select("*")
        .eq("branch_id", branch.id)
        .eq("is_deleted", false)
        .is("voided_at", null);

      if (isStaffView) {
        // Staff: only today's rows ever reach the browser.
        const { data: todaySalesRows } = await supabase
          .from("sales")
          .select("*")
          .eq("branch_id", branch.id)
          .eq("sale_date", today)
          .eq("is_deleted", false)
          .is("voided_at", null);
        const { data: todayExpenseRows } = await supabase
          .from("expenses")
          .select("*")
          .eq("branch_id", branch.id)
          .eq("expense_date", today)
          .eq("is_deleted", false)
          .is("voided_at", null);

        const todaySales =
          todaySalesRows?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const todayExpenses =
          todayExpenseRows?.reduce((sum, e) => sum + e.amount, 0) || 0;

        setStats({
          todaySales,
          weekSales: 0,
          monthSales: 0,
          todayExpenses,
          weekExpenses: 0,
          monthExpenses: 0,
          totalTransactions: todaySalesRows?.length || 0,
          totalErrors: todaySalesRows?.filter((s) => s.has_error).length || 0,
          upcomingBookings:
            bookings?.filter((b) => b.date >= today).length || 0,
          lowStockItems:
            inventory?.filter((i) => i.quantity <= i.low_stock_threshold)
              .length || 0,
        });

        const productMap = {};
        todaySalesRows?.forEach((sale) => {
          productMap[sale.product] =
            (productMap[sale.product] || 0) + sale.total_amount;
        });
        setProductSales(
          Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
        );

        setWeeklyPerformance([]);
        setSalesData(todaySalesRows || []);
        setBookingsData(bookings || []);
        setInventoryData(inventory || []);
      } else {
        // Manager/owner: full branch history, as before.
        const { data: sales } = await supabase
          .from("sales")
          .select("*")
          .eq("branch_id", branch.id)
          .eq("is_deleted", false)
          .is("voided_at", null);
        const { data: expenses } = await supabase
          .from("expenses")
          .select("*")
          .eq("branch_id", branch.id)
          .eq("is_deleted", false)
          .is("voided_at", null);

        const todaySales =
          sales
            ?.filter((s) => s.sale_date === today)
            .reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const weekSales =
          sales
            ?.filter(
              (s) => s.sale_date >= weekAgo.toISOString().split("T")[0]
            )
            .reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const monthSales =
          sales
            ?.filter(
              (s) => s.sale_date >= monthAgo.toISOString().split("T")[0]
            )
            .reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const todayExpenses =
          expenses
            ?.filter((e) => e.expense_date === today)
            .reduce((sum, e) => sum + e.amount, 0) || 0;
        const weekExpenses =
          expenses
            ?.filter(
              (e) => e.expense_date >= weekAgo.toISOString().split("T")[0]
            )
            .reduce((sum, e) => sum + e.amount, 0) || 0;
        const monthExpenses =
          expenses
            ?.filter(
              (e) => e.expense_date >= monthAgo.toISOString().split("T")[0]
            )
            .reduce((sum, e) => sum + e.amount, 0) || 0;

        setStats({
          todaySales,
          weekSales,
          monthSales,
          todayExpenses,
          weekExpenses,
          monthExpenses,
          totalTransactions: sales?.length || 0,
          totalErrors: sales?.filter((s) => s.has_error).length || 0,
          upcomingBookings:
            bookings?.filter((b) => b.date >= today).length || 0,
          lowStockItems:
            inventory?.filter((i) => i.quantity <= i.low_stock_threshold)
              .length || 0,
        });

        const productMap = {};
        sales?.forEach((sale) => {
          productMap[sale.product] =
            (productMap[sale.product] || 0) + sale.total_amount;
        });
        setProductSales(
          Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
        );

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });
          last7Days.push({
            day: dayName,
            sales:
              sales
                ?.filter((s) => s.sale_date === dateStr)
                .reduce((sum, s) => sum + s.total_amount, 0) || 0,
            expenses:
              expenses
                ?.filter((e) => e.expense_date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0) || 0,
          });
        }
        setWeeklyPerformance(last7Days);

        setSalesData(sales || []);
        setBookingsData(bookings || []);
        setInventoryData(inventory || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lowStockAlerts = inventoryData.filter(
    (item) => item.quantity <= item.low_stock_threshold
  );
  const upcomingBookingsList = bookingsData
    .filter((b) => b.date >= new Date().toISOString().split("T")[0])
    .slice(0, 5);
  const recentSales = salesData.slice(0, 5);
  const todayProfit = stats.todaySales - stats.todayExpenses;

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-green-500/20 border-b-green-500 animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border border-green-500/10 blur-sm"></div>
        </div>
      </div>
    );

  const StatCard = ({ title, value, icon: Icon, colorClass, prefix = "₱" }) => (
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
            <span className="text-[var(--text-3)] font-normal mr-0.5">
              {prefix}
            </span>
            {value.toLocaleString()}
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Insights
          </h2>
          <p className="text-[var(--text-2)]">
            {isStaffView ? "Today at " : "Overview for "}
            <span className="text-[var(--accent)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-2)] hover:bg-[var(--chip-bg-hover)] hover:text-[var(--text-1)] transition-all"
          >
            <RefreshCcw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={TrendingUp}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Today's Expenses"
          value={stats.todayExpenses}
          icon={TrendingDown}
          colorClass="bg-red-500"
        />
        {!isStaffView && (
          <StatCard
            title="Today's Profit"
            value={todayProfit}
            icon={DollarSign}
            colorClass={todayProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
          />
        )}
        {!isStaffView && (
          <StatCard
            title="Weekly Sales"
            value={stats.weekSales}
            icon={DollarSign}
            colorClass="bg-blue-500"
          />
        )}
        {!isStaffView && (
          <StatCard
            title="Monthly Sales"
            value={stats.monthSales}
            icon={TrendingUp}
            colorClass="bg-green-500"
          />
        )}
        <StatCard
          title="Printing Errors"
          value={stats.totalErrors}
          icon={Printer}
          colorClass="bg-red-400"
          prefix=""
        />
        {!isStaffView && (
          <StatCard
            title="Bookings"
            value={stats.upcomingBookings}
            icon={Calendar}
            colorClass="bg-indigo-500"
            prefix=""
          />
        )}
        <StatCard
          title={isStaffView ? "Transactions Today" : "Transactions"}
          value={stats.totalTransactions}
          icon={ShoppingBag}
          colorClass="bg-pink-500"
          prefix=""
        />
      </div>

      {/* Charts Row */}
      <div
        className={`grid grid-cols-1 ${
          isStaffView ? "" : "xl:grid-cols-3"
        } gap-6`}
      >
        {!isStaffView && (
          <div className="xl:col-span-2 bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
            <CardHeader
              title="Weekly Performance"
              subtitle="Revenue vs Expenses"
            />
            <div className="h-[260px] md:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyPerformance}>
                  <defs>
                    <linearGradient
                      id="colorSales"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#22c55e"
                        stopOpacity={0.3}
                      />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#22c55e"
                    name="Sales"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#22c55e",
                      strokeWidth: 2,
                      stroke: CHART_THEME.dotStroke,
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
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
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader
            title="Top Products"
            subtitle={isStaffView ? "Today's mix" : "Revenue distribution"}
          />
          <div className="h-[240px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productSales}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productSales.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke={CHART_THEME.pieStroke}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_THEME.tooltip.contentStyle}
                  itemStyle={CHART_THEME.tooltip.itemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {productSales.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-[10px] text-[var(--text-2)] truncate">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[var(--warn-strong)] uppercase tracking-wider">
              Low Stock Warning
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {lowStockAlerts.map((item) => (
                <span
                  key={item.id}
                  className="text-xs text-[var(--warn)] opacity-80"
                >
                  • {item.item_name}:{" "}
                  <span className="font-bold opacity-100">
                    {item.quantity}
                  </span>{" "}
                  left
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader title="Upcoming Bookings" />
          <div className="space-y-3">
            {upcomingBookingsList.length > 0 ? (
              upcomingBookingsList.map((booking) => (
                <div
                  key={booking.id}
                  className="flex justify-between items-center p-4 rounded-2xl bg-[var(--inset-bg)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-1)]">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-[var(--text-3)] flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" /> {booking.date} at{" "}
                      {booking.start_time}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                      booking.status === "confirmed"
                        ? "bg-emerald-500/10 text-[var(--success)]"
                        : "bg-amber-500/10 text-[var(--warn)]"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--text-3)] italic text-sm">
                No upcoming bookings
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
          <CardHeader title={isStaffView ? "Today's Sales" : "Recent Sales"} />
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center p-4 rounded-2xl bg-[var(--inset-bg)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-1)]">
                      {sale.customer_name || "Walk-in Customer"}
                    </p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">
                      {sale.product} <span className="mx-1">•</span> x
                      {sale.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-[var(--success)]">
                    ₱{sale.total_amount.toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--text-3)] italic text-sm">
                {isStaffView ? "No sales yet today" : "No recent sales"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
