import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
  Camera,
  Printer,
  ShoppingBag,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
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
import { supabase } from "../lib/supabase";

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ef4444",
];

export default function Dashboard({ branch }) {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [weeklyPerformance, setWeeklyPerformance] = useState([]);
  const [errorData, setErrorData] = useState([]);
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
  }, [branch]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branch.id);
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("branch_id", branch.id);
      const { data: bookings } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .neq("status", "cancelled");
      const { data: inventory } = await supabase
        .from("inventory")
        .select("*")
        .eq("branch_id", branch.id);

      const todaySales =
        sales
          ?.filter((s) => s.sale_date === today)
          .reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const weekSales =
        sales
          ?.filter((s) => s.sale_date >= weekAgo.toISOString().split("T")[0])
          .reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const monthSales =
        sales
          ?.filter((s) => s.sale_date >= monthAgo.toISOString().split("T")[0])
          .reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const todayExpenses =
        expenses
          ?.filter((e) => e.expense_date === today)
          .reduce((sum, e) => sum + e.amount, 0) || 0;
      const weekExpenses =
        expenses
          ?.filter((e) => e.expense_date >= weekAgo.toISOString().split("T")[0])
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
        upcomingBookings: bookings?.filter((b) => b.date >= today).length || 0,
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
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
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

      const errorMap = {};
      sales
        ?.filter((s) => s.has_error && s.error_type)
        .forEach((sale) => {
          errorMap[sale.error_type] = (errorMap[sale.error_type] || 0) + 1;
        });
      setErrorData(
        Object.entries(errorMap)
          .map(([name, value]) => ({ name, value }))
          .slice(0, 5)
      );

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

  const lowStockAlerts = inventoryData.filter(
    (item) => item.quantity <= item.low_stock_threshold
  );
  const upcomingBookingsList = bookingsData
    .filter((b) => b.date >= new Date().toISOString().split("T")[0])
    .slice(0, 5);
  const recentSales = salesData.slice(0, 5);

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );

  const StatCard = ({ title, value, icon: Icon, color, prefix = "₱" }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">
            {prefix}
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-600">Welcome back, {branch.name}!</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="This Week's Sales"
          value={stats.weekSales}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatCard
          title="This Month's Sales"
          value={stats.monthSales}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={ShoppingBag}
          color="bg-purple-500"
          prefix=""
        />
        <StatCard
          title="Today's Expenses"
          value={stats.todayExpenses}
          icon={TrendingDown}
          color="bg-red-500"
        />
        <StatCard
          title="Printing Errors"
          value={stats.totalErrors}
          icon={Printer}
          color="bg-red-500"
          prefix=""
        />
        <StatCard
          title="Upcoming Bookings"
          value={stats.upcomingBookings}
          icon={Calendar}
          color="bg-purple-500"
          prefix=""
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={Package}
          color="bg-orange-500"
          prefix=""
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Performance</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={weeklyPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#8b5cf6"
              name="Sales"
              strokeWidth={3}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              name="Expenses"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productSales}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                dataKey="value"
              >
                {productSales.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Printing Errors</h3>
          {errorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={errorData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No errors reported ✅
            </div>
          )}
        </div>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Low Stock Alert</h3>
          </div>
          {lowStockAlerts.map((item) => (
            <p key={item.id} className="text-red-700 text-sm">
              ⚠️ {item.item_name}: Only {item.quantity} left
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Bookings</h3>
          {upcomingBookingsList.map((booking) => (
            <div
              key={booking.id}
              className="flex justify-between items-center p-3 border-b"
            >
              <div>
                <p className="font-medium">{booking.customer_name}</p>
                <p className="text-sm text-gray-600">
                  {booking.date} at {booking.start_time}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  booking.status === "confirmed"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {booking.status}
              </span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
          {recentSales.map((sale) => (
            <div
              key={sale.id}
              className="flex justify-between items-center p-3 border-b"
            >
              <div>
                <p className="font-medium">{sale.customer_name || "Walk-in"}</p>
                <p className="text-sm text-gray-600">
                  {sale.product} x{sale.quantity}
                </p>
              </div>
              <p className="font-bold text-green-600">₱{sale.total_amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
