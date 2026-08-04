import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Edit,
  Trash2,
  X,
  ShieldAlert,
  RefreshCcw,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * BudgetSettings Component — owner-only.
 * A simple editable list of fixed monthly costs (Rent, Tax, Maintenance...)
 * per branch. Plugs into the same audit trail as everything else via
 * budget_items' trigger — every add/edit/removal is logged automatically
 * and shows up in the Audit Log.
 */
const categories = [
  { value: "rental", label: "Rental" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "tax", label: "Tax" },
  { value: "other", label: "Other" },
];

export default function BudgetSettings({ branch, staff }) {
  const isOwner = staff?.role === "owner";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "other",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (isOwner) fetchItems();
  }, [branch, isOwner]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("branch_id", branch.id)
      .eq("is_deleted", false)
      .is("voided_at", null)
      .order("category");

    if (error) {
      console.error("Error fetching budget items:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const resetForm = () =>
    setFormData({ item_name: "", category: "other", amount: "", notes: "" });

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      amount: item.amount.toString(),
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      item_name: formData.item_name,
      category: formData.category,
      amount: parseFloat(formData.amount),
      notes: formData.notes || null,
    };

    let error;
    if (editingItem) {
      const { error: updateError } = await supabase
        .from("budget_items")
        .update({
          ...payload,
          updated_by: staff.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("budget_items")
        .insert([{ ...payload, branch_id: branch.id, created_by: staff.id }]);
      error = insertError;
    }

    if (error) {
      alert("Could not save: " + error.message);
      return;
    }
    setShowModal(false);
    setEditingItem(null);
    resetForm();
    fetchItems();
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.item_name}" from the budget?`))
      return;
    const { error } = await supabase
      .from("budget_items")
      .update({
        is_deleted: true,
        updated_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      alert("Could not remove: " + error.message);
      return;
    }
    fetchItems();
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-4 bg-red-500/10 rounded-2xl mb-4">
          <ShieldAlert className="w-8 h-8 text-[var(--danger)]" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-1)] mb-1">
          Owner Access Only
        </h3>
        <p className="text-sm text-[var(--text-3)]">
          Budget settings are only editable by the owner account.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" />
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const byCategory = categories
    .map((c) => ({
      ...c,
      items: items.filter((i) => i.category === c.value),
      subtotal: items
        .filter((i) => i.category === c.value)
        .reduce((sum, i) => sum + Number(i.amount), 0),
    }))
    .filter((c) => c.items.length > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Monthly Budget
          </h2>
          <p className="text-[var(--text-2)]">
            Fixed recurring costs for{" "}
            <span className="text-[var(--accent)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchItems}
            className="p-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--chip-bg-hover)] transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:bg-purple-500 active:scale-95 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
          >
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
            Total Monthly Budget
          </p>
          <p className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            ₱{total.toLocaleString()}
          </p>
        </div>
        <Wallet className="w-10 h-10 text-[var(--accent)] opacity-40" />
      </div>

      {/* Items grouped by category */}
      {byCategory.length === 0 ? (
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-16 text-center">
          <Wallet className="w-16 h-16 text-[var(--text-3)] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-1)] mb-2">
            No budget items yet
          </h3>
          <p className="text-[var(--text-3)] text-sm">
            Add your fixed monthly costs — rent, tax, maintenance — to track
            them here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map((cat) => (
            <div
              key={cat.value}
              className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[var(--chip-bg)] border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-widest">
                  {cat.label}
                </h3>
                <span className="text-sm font-bold text-[var(--accent)]">
                  ₱{cat.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex justify-between items-center px-6 py-4 hover:bg-[var(--chip-bg)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)]">
                        {item.item_name}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[var(--text-1)]">
                        ₱{Number(item.amount).toLocaleString()}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-[var(--text-3)] hover:text-[var(--success)] transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--chip-bg)]">
              <h3 className="text-xl font-bold text-[var(--text-1)]">
                {editingItem ? "Edit Line Item" : "Add Line Item"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                  placeholder="e.g. Rent, Tax, Maintenance"
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-lg font-bold focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows="2"
                  placeholder="e.g. due on the 5th, landlord contact, etc."
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  {editingItem ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
