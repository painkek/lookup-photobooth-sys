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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  // Data states
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [errorData, setErrorData] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);

  // Booking specific data
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

  // Summary stats
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
    if (branch?.id) {
      fetchReportData();
    }
  }, [branch, reportType, dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate, endDate;

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
      let salesQuery = supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branch.id);

      if (startDate && endDate) {
        salesQuery = salesQuery
          .gte("sale_date", startDate)
          .lte("sale_date", endDate);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      let expensesQuery = supabase
        .from("expenses")
        .select("*")
        .eq("branch_id", branch.id);

      if (startDate && endDate) {
        expensesQuery = expensesQuery
          .gte("expense_date", startDate)
          .lte("expense_date", endDate);
      }

      const { data: expenses, error: expensesError } = await expensesQuery;
      if (expensesError) throw expensesError;

      const { data: bookings, error: bookingsError } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .order("date", { ascending: false });

      if (bookingsError) throw bookingsError;

      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .eq("branch_id", branch.id);

      if (inventoryError) throw inventoryError;

      processSalesData(sales || []);
      processExpensesData(expenses || []);
      processProductSales(sales || []);
      processMonthlyStats(sales || [], expenses || []);
      processDailyStats(sales || [], expenses || []);
      processBookingsData(bookings || []);
      processErrorData(sales || []);
      calculateSummary(sales || [], expenses || [], bookings || []);

      setSalesData(sales || []);
      setExpensesData(expenses || []);
      setBookingsData(bookings || []);
      setInventoryData(inventory || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
      alert("Error loading reports: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (sales) => {
    const dailySales = {};
    sales.forEach((sale) => {
      if (!dailySales[sale.sale_date]) {
        dailySales[sale.sale_date] = 0;
      }
      dailySales[sale.sale_date] += sale.total_amount;
    });

    const chartData = Object.entries(dailySales).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString(),
      sales: amount,
    }));

    setDailyStats(chartData.slice(-30));
  };

  const processExpensesData = (expenses) => {
    // Group by category for potential future use
    const categoryTotals = {};
    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
    });
  };

  const processProductSales = (sales) => {
    const productTotals = {};
    sales.forEach((sale) => {
      if (!productTotals[sale.product]) {
        productTotals[sale.product] = 0;
      }
      productTotals[sale.product] += sale.total_amount;
    });

    const chartData = Object.entries(productTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    setProductSales(chartData);
  };

  const processMonthlyStats = (sales, expenses) => {
    const monthlyMap = {};

    sales.forEach((sale) => {
      const month = sale.sale_date.substring(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, sales: 0, expenses: 0, profit: 0 };
      }
      monthlyMap[month].sales += sale.total_amount;
    });

    expenses.forEach((expense) => {
      const month = expense.expense_date.substring(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, sales: 0, expenses: 0, profit: 0 };
      }
      monthlyMap[month].expenses += expense.amount;
    });

    const chartData = Object.values(monthlyMap)
      .map((m) => ({ ...m, profit: m.sales - m.expenses }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setMonthlyStats(chartData);
  };

  const processDailyStats = (sales, expenses) => {
    const dailyMap = {};

    sales.forEach((sale) => {
      if (!dailyMap[sale.sale_date]) {
        dailyMap[sale.sale_date] = {
          date: sale.sale_date,
          sales: 0,
          expenses: 0,
          profit: 0,
        };
      }
      dailyMap[sale.sale_date].sales += sale.total_amount;
    });

    expenses.forEach((expense) => {
      if (!dailyMap[expense.expense_date]) {
        dailyMap[expense.expense_date] = {
          date: expense.expense_date,
          sales: 0,
          expenses: 0,
          profit: 0,
        };
      }
      dailyMap[expense.expense_date].expenses += expense.amount;
    });

    const chartData = Object.values(dailyMap)
      .map((d) => ({ ...d, profit: d.sales - d.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  };

  const processBookingsData = (bookings) => {
    const eventTypeMap = {};
    const statusMap = {};
    const packageMap = {};
    const monthlyBookingsMap = {};
    let totalHours = 0;
    let completedCount = 0;

    bookings.forEach((booking) => {
      if (!eventTypeMap[booking.event_type]) {
        eventTypeMap[booking.event_type] = 0;
      }
      eventTypeMap[booking.event_type]++;

      if (!statusMap[booking.status]) {
        statusMap[booking.status] = 0;
      }
      statusMap[booking.status]++;

      if (!packageMap[booking.package]) {
        packageMap[booking.package] = 0;
      }
      packageMap[booking.package]++;

      const month = booking.date.substring(0, 7);
      if (!monthlyBookingsMap[month]) {
        monthlyBookingsMap[month] = 0;
      }
      monthlyBookingsMap[month]++;

      if (booking.start_time && booking.end_time) {
        const startHour = parseInt(booking.start_time.split(":")[0]);
        const endHour = parseInt(booking.end_time.split(":")[0]);
        const hours = endHour - startHour;
        totalHours += hours;
        if (booking.status === "completed") {
          completedCount++;
        }
      }
    });

    const eventTypeData = Object.entries(eventTypeMap).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));

    const statusData = Object.entries(statusMap).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));

    const monthlyBookingsData = Object.entries(monthlyBookingsMap)
      .map(([month, count]) => ({ month, bookings: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const revenueFromBookings = bookings.reduce(
      (sum, booking) => sum + (booking.total_amount || 0),
      0
    );
    const upcomingBookings = bookings.filter(
      (b) =>
        b.date >= new Date().toISOString().split("T")[0] &&
        b.status !== "cancelled"
    ).length;
    const completedBookings = bookings.filter(
      (b) => b.status === "completed"
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === "cancelled"
    ).length;
    const averageHoursPerBooking =
      completedCount > 0 ? totalHours / completedCount : 0;

    setBookingStats({
      byEventType: eventTypeData,
      byStatus: statusData,
      byPackage: packageMap,
      monthlyBookings: monthlyBookingsData,
      revenueFromBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      averageHoursPerBooking,
      totalHoursBooked: totalHours,
    });
  };

  const processErrorData = (sales) => {
    const errorTypes = {};
    sales
      .filter((s) => s.has_error)
      .forEach((sale) => {
        if (sale.error_type) {
          if (!errorTypes[sale.error_type]) {
            errorTypes[sale.error_type] = 0;
          }
          errorTypes[sale.error_type]++;
        }
      });

    const chartData = Object.entries(errorTypes).map(([name, value]) => ({
      name,
      value,
    }));
    setErrorData(chartData);
  };

  const calculateSummary = (sales, expenses, bookings) => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const bookingRevenue = bookings.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );
    const walkinRevenue = totalRevenue - bookingRevenue;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const totalBookings = bookings.length;
    const avgBookingValue =
      totalBookings > 0 ? bookingRevenue / totalBookings : 0;
    const totalErrors = sales.filter((s) => s.has_error).length;

    const productTotals = {};
    sales.forEach((sale) => {
      if (!productTotals[sale.product]) {
        productTotals[sale.product] = 0;
      }
      productTotals[sale.product] += sale.total_amount;
    });

    let topProduct = { name: "", amount: 0 };
    Object.entries(productTotals).forEach(([name, amount]) => {
      if (amount > topProduct.amount) {
        topProduct = { name, amount };
      }
    });

    const dayTotals = {};
    sales.forEach((sale) => {
      const day = new Date(sale.sale_date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (!dayTotals[day]) {
        dayTotals[day] = 0;
      }
      dayTotals[day] += sale.total_amount;
    });

    let peakDay = { day: "", sales: 0 };
    Object.entries(dayTotals).forEach(([day, salesAmt]) => {
      if (salesAmt > peakDay.sales) {
        peakDay = { day, sales: salesAmt };
      }
    });

    setSummary({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalBookings,
      avgBookingValue,
      totalErrors,
      topProduct,
      peakDay,
      bookingRevenue,
      walkinRevenue,
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Customer",
      "Product/Type",
      "Amount",
      "Type",
      "Status",
    ];
    const salesRows = salesData.map((sale) => [
      sale.sale_date,
      sale.customer_name || "Walk-in",
      sale.product,
      sale.total_amount,
      "Walk-in Sale",
      sale.has_error ? "Error" : "Completed",
    ]);

    const bookingRows = bookingsData.map((booking) => [
      booking.date,
      booking.customer_name,
      `Booking - ${booking.package}`,
      booking.total_amount || 0,
      "Booking",
      booking.status,
    ]);

    const allRows = [...salesRows, ...bookingRows];
    const csvContent = [headers, ...allRows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${branch.name}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            View detailed business insights for {branch.name}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Report Filters - Mobile Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReportData}
                className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
          {dateRange === "custom" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Total Revenue</p>
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-base md:text-2xl font-bold text-gray-900">
            ₱{summary.totalRevenue.toLocaleString()}
          </p>
          <div className="flex justify-between text-[10px] md:text-xs mt-1">
            <span className="text-purple-600 truncate">
              Book: ₱{summary.bookingRevenue.toLocaleString()}
            </span>
            <span className="text-blue-600 truncate">
              Walk: ₱{summary.walkinRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Total Bookings</p>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-base md:text-2xl font-bold text-gray-900">
            {summary.totalBookings}
          </p>
          <div className="flex justify-between text-[10px] md:text-xs mt-1">
            <span className="text-green-600">
              Comp: {bookingStats.completedBookings}
            </span>
            <span className="text-yellow-600">
              Up: {bookingStats.upcomingBookings}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Net Profit</p>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-base md:text-2xl font-bold text-green-600">
            ₱{summary.netProfit.toLocaleString()}
          </p>
          <p className="text-[10px] md:text-xs text-green-600 mt-1">
            ↑ {summary.profitMargin.toFixed(1)}% margin
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Avg Booking Value</p>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-base md:text-2xl font-bold text-gray-900">
            ₱{summary.avgBookingValue.toLocaleString()}
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">
            Per booking
          </p>
        </div>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center gap-1 md:gap-2 mb-1">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
            <p className="text-xs text-gray-600">Avg Hours/Booking</p>
          </div>
          <p className="text-base md:text-2xl font-bold text-gray-900">
            {bookingStats.averageHoursPerBooking.toFixed(1)} hrs
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">
            Total: {bookingStats.totalHoursBooked} hrs
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center gap-1 md:gap-2 mb-1">
            <Printer className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
            <p className="text-xs text-gray-600">Printing Errors</p>
          </div>
          <p className="text-base md:text-2xl font-bold text-red-600">
            {summary.totalErrors}
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">
            {salesData.length > 0
              ? ((summary.totalErrors / salesData.length) * 100).toFixed(1)
              : 0}
            % error rate
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <div className="flex items-center gap-1 md:gap-2 mb-1">
            <Package className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
            <p className="text-xs text-gray-600">Top Product</p>
          </div>
          <p className="text-sm md:text-xl font-bold text-gray-900 truncate">
            {summary.topProduct.name || "N/A"}
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">
            ₱{summary.topProduct.amount.toLocaleString()} revenue
          </p>
        </div>
      </div>

      {/* Charts Section - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
            Financial Performance
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#8b5cf6"
                  name="Revenue"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  name="Expenses"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  name="Profit"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
            Bookings by Event Type
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingStats.byEventType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent > 0.05
                      ? `${name} (${(percent * 100).toFixed(0)}%)`
                      : ""
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bookingStats.byEventType.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
            Top Selling Products
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSales.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={70}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
                  {productSales.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
            Booking Status
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingStats.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bookingStats.byStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
        <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
          Daily Sales Performance (Last 30 Days)
        </h3>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyStats}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#8b5cf6"
                fill="url(#colorSales)"
                name="Daily Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Bookings Trend */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
        <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
          Monthly Bookings Trend
        </h3>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bookingStats.monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="bookings"
                fill="#8b5cf6"
                name="Number of Bookings"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Analysis */}
      {errorData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">
            Printing Error Analysis
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#ef4444"
                  name="Error Count"
                  radius={[8, 8, 0, 0]}
                >
                  {errorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-red-50 rounded-lg">
            <p className="text-xs md:text-sm text-red-800">
              ⚠️ Total Errors: {summary.totalErrors} |
              <span className="ml-2">
                Most common: {errorData[0]?.name || "None"} (
                {errorData[0]?.value || 0} incidents)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Recent Bookings - Mobile Card View */}
      <div className="block md:hidden">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold">Recent Bookings</h3>
          </div>
          <div className="divide-y">
            {bookingsData.slice(0, 5).map((booking) => (
              <div key={booking.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-gray-500">{booking.date}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      booking.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : booking.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-gray-600">{booking.event_type}</span>
                  <span className="font-bold text-green-600">
                    ₱{(booking.total_amount || 8500).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold">Recent Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookingsData.slice(0, 10).map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {booking.date}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {booking.customer_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {booking.event_type}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">
                    ₱{(booking.total_amount || 8500).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : booking.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookingsData.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sales - Mobile Card View */}
      <div className="block md:hidden">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold">Recent Walk-in Sales</h3>
          </div>
          <div className="divide-y">
            {salesData.slice(0, 5).map((sale) => (
              <div key={sale.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">
                      {sale.customer_name || "Walk-in"}
                    </p>
                    <p className="text-xs text-gray-500">{sale.sale_date}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600">
                    ₱{sale.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-gray-600">
                    {sale.product} x{sale.quantity}
                  </span>
                  <span className="capitalize">{sale.payment_method}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold">Recent Walk-in Sales</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salesData.slice(0, 10).map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sale.sale_date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sale.customer_name || "Walk-in"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sale.product} x{sale.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">
                    ₱{sale.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {sale.payment_method}
                  </td>
                </tr>
              ))}
              {salesData.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No sales data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
        <div className="flex items-start gap-2 md:gap-3">
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm md:text-base">
              Business Insights
            </h3>
            <p className="text-xs md:text-sm text-blue-800 mt-1 space-y-1">
              • 📊 Profit Margin: {summary.profitMargin.toFixed(1)}% -{" "}
              {summary.profitMargin > 50
                ? "Excellent!"
                : summary.profitMargin > 30
                ? "Good"
                : "Consider cost optimization"}
              <br />• 🏆 Top Product: {summary.topProduct.name || "N/A"} (
              {summary.totalRevenue > 0
                ? (
                    (summary.topProduct.amount / summary.totalRevenue) *
                    100
                  ).toFixed(0)
                : 0}
              % of revenue)
              <br />• 📅 Peak Day: {summary.peakDay.day}s (₱
              {summary.peakDay.sales.toLocaleString()} avg)
              <br />• 🎉 Most Popular Event:{" "}
              {bookingStats.byEventType[0]?.name || "N/A"} (
              {bookingStats.byEventType[0]?.value || 0} bookings)
              <br />• ⏰ Avg Booking Duration:{" "}
              {bookingStats.averageHoursPerBooking.toFixed(1)} hours
              <br />•{" "}
              {summary.totalErrors > 0
                ? `⚠️ ${summary.totalErrors} printing errors - check ${
                    errorData[0]?.name || "printer"
                  } issues`
                : "✅ No printing errors - great quality!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
