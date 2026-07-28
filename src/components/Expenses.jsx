import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Calendar,
  Tag,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Expenses Component — CSS-variable theming
 */
const categories = [
  {
    value: "rental",
    label: "Rental",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    value: "utilities",
    label: "Utilities",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    value: "supplies",
    label: "Supplies",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  {
    value: "salary",
    label: "Salary",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    value: "other",
    label: "Other",
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
];

export default function Expenses({ branch }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category: "supplies",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, [branch]);

  const fetchExpenses = async () => {
    setLoading(true);
    let query = supabase
      .from("expenses")
      .select("*")
      .eq("branch_id", branch.id)
      .order("expense_date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expenses:", error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const expenseData = {
      branch_id: branch.id,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date,
    };

    let error;
    if (editingExpense) {
      const { error: updateError } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingExpense.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("expenses")
        .insert([expenseData]);
      error = insertError;
    }

    if (!error) {
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        category: "supplies",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
      fetchExpenses();
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
    });
    setShowModal(true);
  };

  const handleDelete = async (expense) => {
    if (window.confirm(`Delete expense: ${expense.description}?`)) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id);
      if (!error) fetchExpenses();
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter((e) => {
    const d = new Date(e.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalThisMonth = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayExpenses = expenses
    .filter((e) => e.expense_date === new Date().toISOString().split("T")[0])
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-red-500/20 border-b-red-500 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ title, value, colorClass, subtitle }) => (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 transition-all hover:border-[var(--border-hover)]">
      <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
        {title}
      </p>
      <p className={`text-xl font-semibold tracking-tight ${colorClass}`}>
        ₱{value.toLocaleString()}
      </p>
      {subtitle && (
        <p className="text-[10px] text-[var(--text-3)] mt-1">{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Expenses
          </h2>
          <p className="text-[var(--text-2)]">
            Financial tracking for{" "}
            <span className="text-[var(--danger)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowModal(true);
          }}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold overflow-hidden transition-all hover:bg-red-500 active:scale-95 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]"
        >
          <Plus className="w-4 h-4" /> Add New Expense
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total This Month"
          value={totalThisMonth}
          colorClass="text-[var(--text-1)]"
          subtitle={`${monthlyExpenses.length} transactions`}
        />
        <StatCard
          title="Today's Outflow"
          value={todayExpenses}
          colorClass="text-[var(--danger)]"
        />
        <StatCard
          title="Average Daily"
          value={monthlyExpenses.length ? (totalThisMonth / 30).toFixed(0) : 0}
          colorClass="text-[var(--accent)]"
        />
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2 text-center">
            Budget Health
          </p>
          <div className="w-full bg-[var(--chip-bg)] rounded-full h-2 relative overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min((totalThisMonth / 50000) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-3)] mt-2 text-center italic">
            Limit: ₱50,000
          </p>
        </div>
      </div>

      {/* Category Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const total = expenses
            .filter(
              (e) =>
                e.category === cat.value &&
                new Date(e.expense_date).getMonth() === currentMonth
            )
            .reduce((sum, e) => sum + e.amount, 0);
          return (
            <div
              key={cat.value}
              className={`p-3 rounded-2xl border ${cat.color} transition-all hover:scale-105`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">
                {cat.label}
              </p>
              <p className="text-sm font-bold">₱{total.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl p-4 backdrop-blur-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-3)] group-focus-within:text-red-500 transition-colors" />
          <input
            type="text"
            placeholder="Search descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-2)] focus:ring-2 focus:ring-red-500/50 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-2)] hover:bg-[var(--chip-bg-hover)] transition-all">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--chip-bg)]">
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                Date
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                Category
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                Description
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                Amount
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredExpenses.map((expense) => {
              const cat = categories.find((c) => c.value === expense.category);
              return (
                <tr
                  key={expense.id}
                  className="group hover:bg-[var(--chip-bg)] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-[var(--text-2)]">
                    {expense.expense_date}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${cat?.color}`}
                    >
                      {cat?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-1)]">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-[var(--danger)]">
                    ₱{expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 text-[var(--text-3)] hover:text-[var(--success)] hover:bg-emerald-400/10 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {filteredExpenses.map((expense) => {
          const cat = categories.find((c) => c.value === expense.category);
          return (
            <div
              key={expense.id}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--text-1)]">
                    {expense.description}
                  </p>
                  <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider mt-1">
                    {expense.expense_date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2 text-[var(--success)] opacity-70"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense)}
                    className="p-2 text-[var(--danger)] opacity-70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${cat?.color}`}
                >
                  {cat?.label}
                </span>
                <p className="text-base font-bold text-[var(--danger)]">
                  ₱{expense.amount.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--chip-bg)]">
              <h3 className="text-xl font-bold text-[var(--text-1)]">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expense_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-red-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-red-500/50 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm focus:ring-2 focus:ring-red-500/50 outline-none"
                  rows="2"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-lg font-bold focus:ring-2 focus:ring-red-500/50 outline-none"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
                >
                  {editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--danger)] uppercase tracking-wider">
            Financial Insights
          </h4>
          <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
            Accurate categorization drives better reporting. Monitor the
            "Highest Category" to identify potential cost-saving opportunities
            and keep your branch profitable.
          </p>
        </div>
      </div>
    </div>
  );
}
