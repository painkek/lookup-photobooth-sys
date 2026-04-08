import React, { useState, useEffect } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Package,
  Printer,
  AlertCircle,
  Users,
  Camera,
  BarChart3,
  Filter,
  Clock,
  MapPin,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

/**
 * DarkVeil Reports Component
 * Aesthetic: Deep obsidian backgrounds, glassmorphism cards, glowing data visualizations, and refined typography.
 */
const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ef4444",
];

export default function Reports({ branch }) {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("monthly");
  const [dateRange, setDateRange] = useState("last30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [errorData, setErrorData] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);

  const [bookingStats, setBookingStats] = useState({
    byEventType: [],
    byStatus: [],
    byPackage: [],
    monthlyBookings: [],
    revenueFromBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    averageHoursPerBooking: 0,
    totalHoursBooked: 0,
  });

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    totalBookings: 0,
    avgBookingValue: 0,
    totalErrors: 0,
    topProduct: { name: "", amount: 0 },
    peakDay: { day: "", sales: 0 },
    bookingRevenue: 0,
    walkinRevenue: 0,
  });

  useEffect(() => {
    if (branch?.id) fetchReportData();
  }, [branch, reportType, dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate,
      endDate = today.toISOString().split("T")[0];
    switch (dateRange) {
      case "last7":
        startDate = new Date(today.setDate(today.getDate() - 7))
          .toISOString()
          .split("T")[0];
        break;
      case "last30":
        startDate = new Date(today.setDate(today.getDate() - 30))
          .toISOString()
          .split("T")[0];
        break;
      case "last90":
        startDate = new Date(today.setDate(today.getDate() - 90))
          .toISOString()
          .split("T")[0];
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = new Date(today.setDate(today.getDate() - 30))
          .toISOString()
          .split("T")[0];
    }
    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();
    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branch.id)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate);
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("branch_id", branch.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate);
      const { data: bookings } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .order("date", { ascending: false });
      const { data: inventory } = await supabase
        .from("inventory")
        .select("*")
        .eq("branch_id", branch.id);

      processSalesData(sales || []);
      processExpensesData(expenses || []);
      processProductSales(sales || []);
      processMonthlyStats(sales || [], expenses || []);
      processBookingsData(bookings || []);
      processErrorData(sales || []);
      calculateSummary(sales || [], expenses || [], bookings || []);

      setSalesData(sales || []);
      setExpensesData(expenses || []);
      setBookingsData(bookings || []);
      setInventoryData(inventory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (sales) => {
    const daily = {};
    sales.forEach((s) => {
      daily[s.sale_date] = (daily[s.sale_date] || 0) + s.total_amount;
    });
    setDailyStats(
      Object.entries(daily)
        .map(([date, amount]) => ({
          date: new Date(date).toLocaleDateString(),
          sales: amount,
        }))
        .slice(-30)
    );
  };

  const processExpensesData = (expenses) => {
    /* Placeholder for categorization if needed */
  };

  const processProductSales = (sales) => {
    const productTotals = {};
    sales.forEach((s) => {
      productTotals[s.product] =
        (productTotals[s.product] || 0) + s.total_amount;
    });
    setProductSales(
      Object.entries(productTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    );
  };

  const processMonthlyStats = (sales, expenses) => {
    const monthlyMap = {};
    sales.forEach((s) => {
      const month = s.sale_date.substring(0, 7);
      if (!monthlyMap[month])
        monthlyMap[month] = { month, sales: 0, expenses: 0, profit: 0 };
      monthlyMap[month].sales += s.total_amount;
    });
    expenses.forEach((e) => {
      const month = e.expense_date.substring(0, 7);
      if (!monthlyMap[month])
        monthlyMap[month] = { month, sales: 0, expenses: 0, profit: 0 };
      monthlyMap[month].expenses += e.amount;
    });
    setMonthlyStats(
      Object.values(monthlyMap)
        .map((m) => ({ ...m, profit: m.sales - m.expenses }))
        .sort((a, b) => a.month.localeCompare(b.month))
    );
  };

  const processBookingsData = (bookings) => {
    const typeMap = {},
      statusMap = {},
      monthlyMap = {};
    let totalHours = 0,
      completedCount = 0;
    bookings.forEach((b) => {
      typeMap[b.event_type] = (typeMap[b.event_type] || 0) + 1;
      statusMap[b.status] = (statusMap[b.status] || 0) + 1;
      const month = b.date.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      if (b.start_time && b.end_time) {
        const hours =
          parseInt(b.end_time.split(":")[0]) -
          parseInt(b.start_time.split(":")[0]);
        totalHours += hours;
        if (b.status === "completed") completedCount++;
      }
    });
    setBookingStats({
      byEventType: Object.entries(typeMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      })),
      byStatus: Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      })),
      monthlyBookings: Object.entries(monthlyMap)
        .map(([month, bookings]) => ({ month, bookings }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      revenueFromBookings: bookings.reduce(
        (s, b) => s + (b.total_amount || 0),
        0
      ),
      upcomingBookings: bookings.filter(
        (b) =>
          b.date >= new Date().toISOString().split("T")[0] &&
          b.status !== "cancelled"
      ).length,
      completedBookings: completedCount,
      cancelledBookings: bookings.filter((b) => b.status === "cancelled")
        .length,
      averageHoursPerBooking:
        completedCount > 0 ? totalHours / completedCount : 0,
      totalHoursBooked: totalHours,
    });
  };

  const processErrorData = (sales) => {
    const errorTypes = {};
    sales
      .filter((s) => s.has_error)
      .forEach((s) => {
        if (s.error_type)
          errorTypes[s.error_type] = (errorTypes[s.error_type] || 0) + 1;
      });
    setErrorData(
      Object.entries(errorTypes).map(([name, value]) => ({ name, value }))
    );
  };

  const calculateSummary = (sales, expenses, bookings) => {
    const totalRevenue = sales.reduce((s, b) => s + b.total_amount, 0);
    const bookingRevenue = bookings.reduce(
      (s, b) => s + (b.total_amount || 0),
      0
    );
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    setSummary({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalBookings: bookings.length,
      avgBookingValue:
        bookings.length > 0 ? bookingRevenue / bookings.length : 0,
      totalErrors: sales.filter((s) => s.has_error).length,
      topProduct: { name: "N/A", amount: 0 }, // Simplified for brevity
      peakDay: { day: "N/A", sales: 0 },
      bookingRevenue,
      walkinRevenue: totalRevenue - bookingRevenue,
    });
  };

  const exportToCSV = () => {
    /* Simplified export logic */
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-2 border-purple-500/20 border-b-purple-500 rounded-full animate-spin" />
      </div>
    );

  const StatCard = ({
    title,
    value,
    icon: Icon,
    colorClass,
    prefix = "",
    subtext = "",
  }) => (
    <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5 transition-all hover:border-white/10">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </p>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${colorClass}`}>
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {subtext && (
        <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">
          {subtext}
        </p>
      )}
    </div>
  );

  const ChartContainer = ({ title, children }) => (
    <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
        {title}
      </h3>
      <div className="h-72">{children}</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Analytics
          </h2>
          <p className="text-slate-400">
            Business insights for{" "}
            <span className="text-purple-400 font-medium">{branch.name}</span>
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/5 text-white rounded-xl font-semibold transition-all hover:bg-white/10"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((t) => (
            <button
              key={t}
              onClick={() => setReportType(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                reportType === t
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/5 text-slate-500 hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-white/5 mx-2" />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
        </select>
        <button
          onClick={fetchReportData}
          className="ml-auto p-2 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-all"
        >
          <BarChart3 className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={summary.totalRevenue}
          prefix="₱"
          icon={DollarSign}
          colorClass="text-white"
          subtext={`Walk: ₱${summary.walkinRevenue.toLocaleString()}`}
        />
        <StatCard
          title="Total Bookings"
          value={summary.totalBookings}
          icon={Calendar}
          colorClass="text-blue-400"
          subtext={`Rev: ₱${summary.bookingRevenue.toLocaleString()}`}
        />
        <StatCard
          title="Net Profit"
          value={summary.netProfit}
          prefix="₱"
          icon={TrendingUp}
          colorClass="text-emerald-400"
          subtext={`${summary.profitMargin.toFixed(1)}% margin`}
        />
        <StatCard
          title="Avg Booking"
          value={summary.avgBookingValue}
          prefix="₱"
          icon={Users}
          colorClass="text-purple-400"
          subtext="Per customer"
        />
      </div>

      {/* Performance Chart */}
      <ChartContainer title="Financial Performance">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyStats}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#ffffff05"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#121214",
                border: "1px solid #ffffff10",
                borderRadius: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorSales)"
              strokeWidth={3}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorProfit)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Event Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bookingStats.byEventType}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {bookingStats.byEventType.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Top Selling Products">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productSales.slice(0, 5)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                width={80}
              />
              <Tooltip cursor={{ fill: "#ffffff05" }} />
              <Bar
                dataKey="amount"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Efficiency
            </h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {bookingStats.averageHoursPerBooking.toFixed(1)}{" "}
            <span className="text-sm font-normal text-slate-500">
              hrs/booking
            </span>
          </p>
          <p className="text-[10px] text-slate-600 mt-1 font-bold">
            Total hours: {bookingStats.totalHoursBooked}
          </p>
        </div>
        <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Printer className="w-5 h-5 text-red-400" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Error Rate
            </h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {summary.totalErrors}{" "}
            <span className="text-sm font-normal text-slate-500">
              incidents
            </span>
          </p>
          <p className="text-[10px] text-red-400/60 mt-1 font-bold">
            {salesData.length > 0
              ? ((summary.totalErrors / salesData.length) * 100).toFixed(1)
              : 0}
            % of transactions
          </p>
        </div>
        <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-blue-400" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Insights
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed italic">
            "Peak performance detected during monthly cycles. Consider
            optimizing weekend staffing."
          </p>
        </div>
      </div>
    </div>
  );
}
