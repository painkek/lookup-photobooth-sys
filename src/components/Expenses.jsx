import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const categories = [
  { value: "rental", label: "Rental", color: "bg-blue-100 text-blue-800" },
  {
    value: "utilities",
    label: "Utilities",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "supplies",
    label: "Supplies",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "salary", label: "Salary", color: "bg-green-100 text-green-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
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

  // Fetch expenses from Supabase
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
      alert("Error loading expenses: " + error.message);
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

    if (error) {
      alert(
        `Error ${editingExpense ? "updating" : "recording"} expense: ` +
          error.message
      );
    } else {
      alert(`Expense ${editingExpense ? "updated" : "recorded"} successfully!
     
Category: ${formData.category}
Description: ${formData.description}
Amount: ₱${parseFloat(formData.amount).toLocaleString()}
Date: ${formData.expense_date}`);

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
    if (
      window.confirm(
        `Are you sure you want to delete this expense?\n\n${expense.description} - ₱${expense.amount}`
      )
    ) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id);

      if (error) {
        alert("Error deleting expense: " + error.message);
      } else {
        alert("Expense deleted successfully!");
        fetchExpenses();
      }
    }
  };

  // Calculate summary stats from real data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    );
  });

  const totalThisMonth = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = {};
  expenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = 0;
    }
    categoryTotals[expense.category] += expense.amount;
  });

  const highestCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const todayExpenses = expenses
    .filter((e) => e.expense_date === new Date().toISOString().split("T")[0])
    .reduce((sum, e) => sum + e.amount, 0);

  // Filter expenses based on search and category
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
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
            Expenses
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Track all branch expenses for {branch.name}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              category: "supplies",
              description: "",
              amount: "",
              expense_date: new Date().toISOString().split("T")[0],
            });
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Total This Month</p>
          <p className="text-lg md:text-2xl font-bold text-gray-900">
            ₱{totalThisMonth.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {monthlyExpenses.length} transactions
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Today's Expenses</p>
          <p className="text-lg md:text-2xl font-bold text-orange-600">
            ₱{todayExpenses.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Highest Category</p>
          <p className="text-base md:text-2xl font-bold text-gray-900">
            {highestCategory
              ? highestCategory[0].charAt(0).toUpperCase() +
                highestCategory[0].slice(1)
              : "None"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {highestCategory
              ? `₱${highestCategory[1].toLocaleString()}`
              : "No data"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Average Daily</p>
          <p className="text-lg md:text-2xl font-bold text-purple-600">
            ₱{monthlyExpenses.length ? (totalThisMonth / 30).toFixed(0) : 0}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 mt-2">
            <div
              className="bg-red-600 h-1.5 md:h-2 rounded-full"
              style={{
                width: `${Math.min((totalThisMonth / 50000) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Monthly budget: ₱50,000</p>
        </div>
      </div>

      {/* Category Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
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
              className={`${cat.color} rounded-lg p-2 md:p-3 text-center`}
            >
              <p className="text-xs font-medium">{cat.label}</p>
              <p className="text-sm md:text-lg font-bold">
                ₱{total.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses by description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
          <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {filteredExpenses.map((expense) => {
          const category = categories.find((c) => c.value === expense.category);
          return (
            <div key={expense.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {expense.expense_date}
                  </p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Category:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${category?.color}`}
                  >
                    {category?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-base font-bold text-red-600">
                    ₱{expense.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredExpenses.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            {expenses.length === 0
              ? 'No expenses recorded yet. Click "Add Expense" to get started!'
              : "No expenses match your filters."}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.map((expense) => {
                const category = categories.find(
                  (c) => c.value === expense.category
                );
                return (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.expense_date}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${category?.color}`}
                      >
                        {category?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                      ₱{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-green-600 hover:text-green-800 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    {expenses.length === 0
                      ? 'No expenses recorded yet. Click "Add Expense" to get started!'
                      : "No expenses match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal - Mobile Optimized */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg p-5 max-w-md w-full my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expense_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Describe the expense..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="2"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {formData.amount && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Expense:</span>
                    <span className="text-lg font-bold text-red-600">
                      ₱{parseFloat(formData.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm"
                >
                  {editingExpense ? "Update Expense" : "Save Expense"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm md:text-base">
              Expense Management Tips
            </h3>
            <p className="text-xs md:text-sm text-blue-800 mt-1">
              • Categorize expenses accurately for better financial reporting
              <br />
              • Keep receipts and attach notes for future reference
              <br />
              • Regular expense tracking helps optimize business costs
              <br />• Set monthly budgets for each category to control spending
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
