import React, { useState, useEffect } from "react";
import {
  Package,
  AlertCircle,
  AlertTriangle,
  Edit,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Ban,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Inventory Component — Module 1: identity + audit trail
 * - Every record stamps created_by / updated_by (staff on shift)
 * - Staff VOID (reason required, row kept); managers/owners soft-delete
 * - Voided and deleted items are excluded from the grid and stats
 */
const inventoryItems = [
  {
    type: "photo_paper",
    name: "Photo Paper",
    unit: "sheets",
    icon: "📄",
    defaultThreshold: 50,
  },
  {
    type: "photo_plastic",
    name: "Photo Plastic",
    unit: "pieces",
    icon: "💎",
    defaultThreshold: 30,
  },
  {
    type: "ink",
    name: "Ink Cartridge",
    unit: "cartridges",
    icon: "🖨️",
    defaultThreshold: 5,
  },
  {
    type: "keychain",
    name: "Keychain",
    unit: "pieces",
    icon: "🔑",
    defaultThreshold: 20,
  },
];

export default function Inventory({ branch, staff }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [formData, setFormData] = useState({ quantity: "", notes: "" });
  const [editFormData, setEditFormData] = useState({
    item_name: "",
    unit: "",
    low_stock_threshold: "",
  });
  const [newItemData, setNewItemData] = useState({
    item_type: "photo_paper",
    item_name: "",
    quantity: "",
    unit: "sheets",
    low_stock_threshold: 50,
  });

  // Managers and owners may remove an item outright (soft delete).
  // Staff may only void — the row stays, flagged, with a reason.
  const canDelete = staff?.role === "owner" || staff?.role === "manager";

  useEffect(() => {
    fetchInventory();
  }, [branch]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("branch_id", branch.id)
      .eq("is_deleted", false)
      .is("voided_at", null)
      .order("item_type");

    if (error) {
      console.error("Error fetching inventory:", error);
    } else if (data && data.length > 0) {
      setInventory(data);
    } else {
      await createDefaultInventory();
    }
    setLoading(false);
  };

  const createDefaultInventory = async () => {
    const defaultItems = inventoryItems.map((item) => ({
      branch_id: branch.id,
      item_type: item.type,
      item_name: item.name,
      quantity: 100,
      unit: item.unit,
      low_stock_threshold: item.defaultThreshold,
      created_by: staff?.id || null,
    }));
    const { error } = await supabase.from("inventory").insert(defaultItems);
    if (!error) fetchInventory();
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    const newQuantity = selectedItem.quantity + parseInt(formData.quantity);
    const { error } = await supabase
      .from("inventory")
      .update({
        quantity: newQuantity,
        updated_by: staff?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedItem.id);

    if (!error) {
      setShowRestockModal(false);
      setSelectedItem(null);
      setFormData({ quantity: "", notes: "" });
      fetchInventory();
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditFormData({
      item_name: item.item_name,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
    });
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("inventory")
      .update({
        item_name: editFormData.item_name,
        unit: editFormData.unit,
        low_stock_threshold: parseInt(editFormData.low_stock_threshold),
        updated_by: staff?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedItem.id);

    if (!error) {
      setShowEditItemModal(false);
      setSelectedItem(null);
      fetchInventory();
    }
  };

  const handleUpdateThreshold = async (item, newThreshold) => {
    const { error } = await supabase
      .from("inventory")
      .update({
        low_stock_threshold: newThreshold,
        updated_by: staff?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (!error) fetchInventory();
  };

  const handleAddNewItem = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("inventory").insert([
      {
        branch_id: branch.id,
        item_type: newItemData.item_type,
        item_name:
          newItemData.item_name ||
          inventoryItems.find((i) => i.type === newItemData.item_type)?.name,
        quantity: parseInt(newItemData.quantity),
        unit: newItemData.unit,
        low_stock_threshold: parseInt(newItemData.low_stock_threshold),
        created_by: staff?.id || null,
      },
    ]);
    if (!error) {
      setShowAddItemModal(false);
      setNewItemData({
        item_type: "photo_paper",
        item_name: "",
        quantity: "",
        unit: "sheets",
        low_stock_threshold: 50,
      });
      fetchInventory();
    }
  };

  // Void (staff) or soft delete (manager/owner) — both keep the row and
  // both fire the audit trigger, which pushes a notification.
  const confirmVoid = async () => {
    if (!voidReason.trim()) return;
    setVoidBusy(true);

    const payload = canDelete
      ? {
          is_deleted: true,
          void_reason: voidReason.trim(),
          updated_by: staff?.id || null,
          updated_at: new Date().toISOString(),
        }
      : {
          voided_at: new Date().toISOString(),
          voided_by: staff?.id || null,
          void_reason: voidReason.trim(),
        };

    const { error } = await supabase
      .from("inventory")
      .update(payload)
      .eq("id", voidTarget.id);

    setVoidBusy(false);

    if (error) {
      alert("Could not complete: " + error.message);
      return;
    }
    setVoidTarget(null);
    setVoidReason("");
    fetchInventory();
  };

  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => {
    const avgPrice = {
      photo_paper: 0.5,
      photo_plastic: 2,
      ink: 25,
      keychain: 5,
    };
    return sum + item.quantity * (avgPrice[item.item_type] || 10);
  }, 0);
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.low_stock_threshold
  );
  const outOfStockItems = inventory.filter((item) => item.quantity === 0);
  const lastRestocked = inventory.reduce((latest, item) => {
    if (
      item.updated_at &&
      (!latest || new Date(item.updated_at) > new Date(latest))
    )
      return item.updated_at;
    return latest;
  }, null);

  const filteredInventory = inventory.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, colorClass, prefix = "" }) => (
  <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 md:p-5 transition-all hover:border-[var(--border-hover)]">
    <div className="flex justify-between items-start gap-2">
      <div className="flex flex-col min-h-[3.25rem] min-w-0">
        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
          {title}
        </p>
        <p
          className={`text-lg md:text-2xl font-semibold tracking-tight mt-auto truncate ${colorClass}`}
        >
          {prefix}
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </div>
      <div className="flex-shrink-0 p-2 bg-[var(--chip-bg)] rounded-lg border border-[var(--border)]">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-[var(--text-2)]" />
      </div>
    </div>
  </div>
);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Inventory
          </h2>
          <p className="text-[var(--text-2)]">
            Stock management for{" "}
            <span className="text-[var(--accent)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchInventory()}
            className="p-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--chip-bg-hover)] transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:bg-purple-500 active:scale-95 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Stock Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
            <h3 className="text-sm font-bold text-[var(--danger)] uppercase tracking-widest">
              Critical Stock Alerts
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {outOfStockItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <span className="text-sm font-bold text-[var(--danger)]">
                  {item.item_name}{" "}
                  <span className="text-[10px] ml-1 opacity-60">
                    OUT OF STOCK
                  </span>
                </span>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowRestockModal(true);
                  }}
                  className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-red-400 transition-colors"
                >
                  Restock
                </button>
              </div>
            ))}
            {lowStockItems
              .filter((i) => i.quantity > 0)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                >
                  <span className="text-sm font-bold text-[var(--warn)]">
                    {item.item_name}{" "}
                    <span className="text-[10px] ml-1 opacity-60">
                      {item.quantity} {item.unit} left
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Restock
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={totalItems}
          icon={Package}
          colorClass="text-[var(--text-1)]"
        />
        <StatCard
          title="Total Value"
          value={totalValue}
          prefix="₱"
          icon={TrendingUp}
          colorClass="text-[var(--success)]"
        />
        <StatCard
          title="Low Stock"
          value={lowStockItems.length}
          icon={TrendingDown}
          colorClass="text-[var(--warn)]"
        />
        <StatCard
          title="Last Restocked"
          value={
            lastRestocked
              ? new Date(lastRestocked).toLocaleDateString()
              : "Never"
          }
          icon={RefreshCw}
          colorClass="text-[var(--info)]"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl p-4 backdrop-blur-sm">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => {
          const isLowStock = item.quantity <= item.low_stock_threshold;
          const stockPercentage = Math.min(
            (item.quantity / (item.low_stock_threshold * 2)) * 100,
            100
          );
          const itemInfo = inventoryItems.find(
            (i) => i.type === item.item_type
          );

          return (
            <div
              key={item.id}
              className="group relative bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 transition-all hover:border-[var(--border-hover)]"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--chip-bg)] rounded-2xl flex items-center justify-center text-2xl border border-[var(--border)] group-hover:border-purple-500/30 transition-colors">
                    {itemInfo?.icon || "📦"}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-1)] tracking-tight">
                      {item.item_name}
                    </h3>
                    <p className="text-[10px] text-[var(--text-3)] uppercase tracking-widest">
                      {item.item_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="p-2 text-[var(--text-3)] hover:text-[var(--success)] transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setVoidTarget(item);
                      setVoidReason("");
                    }}
                    className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                    title={canDelete ? "Remove item" : "Void item"}
                  >
                    {canDelete ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
                    {item.quantity}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
                    {item.unit}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                      Stock Health
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isLowStock
                          ? "bg-red-500/10 text-[var(--danger)] border-red-500/20"
                          : "bg-emerald-500/10 text-[var(--success)] border-emerald-500/20"
                      }`}
                    >
                      {isLowStock ? "Critical" : "Optimal"}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--chip-bg)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isLowStock ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-3)] italic">
                    Threshold: {item.low_stock_threshold} {item.unit}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const newThreshold = prompt(
                        "Enter new threshold:",
                        item.low_stock_threshold
                      );
                      if (newThreshold && !isNaN(newThreshold))
                        handleUpdateThreshold(item, parseInt(newThreshold));
                    }}
                    className="flex-1 py-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[10px] font-bold text-[var(--text-2)] uppercase tracking-widest hover:bg-[var(--chip-bg-hover)] hover:text-[var(--text-1)] transition-all"
                  >
                    Set Threshold
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-[var(--success)] uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                  >
                    + Restock
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredInventory.length === 0 && (
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-16 text-center backdrop-blur-sm">
          <Package className="w-16 h-16 text-[var(--text-3)] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-1)] mb-2">
            No items found
          </h3>
          <p className="text-[var(--text-3)] text-sm">
            Add items to start tracking your inventory stock levels.
          </p>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowRestockModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-[var(--text-1)]">
                Restock Item
              </h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRestock} className="space-y-6">
              <div className="p-4 bg-[var(--chip-bg)] border border-[var(--border)] rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
                    {selectedItem.item_name}
                  </p>
                  <p className="text-sm text-[var(--text-2)]">
                    Current Stock:{" "}
                    <span className="text-[var(--text-1)] font-bold">
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                  </p>
                </div>
                <div className="text-3xl opacity-50">
                  {inventoryItems.find((i) => i.type === selectedItem.item_type)
                    ?.icon || "📦"}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-xl font-bold focus:ring-2 focus:ring-purple-500/50 outline-none"
                  placeholder="0"
                />
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
                  className="w-full px-4 py-3 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                  rows="2"
                  placeholder="Supplier, Batch #, etc."
                />
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--success)] uppercase tracking-widest">
                  New Stock Level
                </span>
                <span className="text-2xl font-bold text-[var(--text-1)]">
                  {selectedItem.quantity + (parseInt(formData.quantity) || 0)}{" "}
                  {selectedItem.unit}
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowEditItemModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-[var(--text-1)]">
                Edit Item
              </h3>
              <button
                onClick={() => setShowEditItemModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Item Name
                </label>
                <input
                  type="text"
                  value={editFormData.item_name}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      item_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Unit
                </label>
                <input
                  type="text"
                  value={editFormData.unit}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, unit: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.low_stock_threshold}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      low_stock_threshold: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowAddItemModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-[var(--text-1)]">
                Add New Item
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNewItem} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Item Type
                </label>
                <select
                  value={newItemData.item_type}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      item_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                >
                  {inventoryItems.map((i) => (
                    <option key={i.type} value={i.type}>
                      {i.icon} {i.name}
                    </option>
                  ))}
                  <option value="frame">🖼️ Photo Frame</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Custom Name (optional)
                </label>
                <input
                  type="text"
                  value={newItemData.item_name}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      item_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemData.quantity}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newItemData.unit}
                    onChange={(e) =>
                      setNewItemData({ ...newItemData, unit: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemData.low_stock_threshold}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      low_stock_threshold: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void / Remove Modal — reason is mandatory */}
      {voidTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setVoidTarget(null)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/15 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-1)]">
                {canDelete ? "Remove Item" : "Void Item"}
              </h3>
            </div>

            <div className="p-4 bg-[var(--chip-bg)] border border-[var(--border)] rounded-2xl mb-5">
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {voidTarget.item_name}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                {voidTarget.quantity} {voidTarget.unit} in stock
              </p>
            </div>

            <div className="space-y-1.5 mb-6">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                Reason (required)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows="3"
                autoFocus
                placeholder="e.g. discontinued item, entered by mistake"
                className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm placeholder:text-[var(--text-3)] focus:ring-2 focus:ring-red-500/50 outline-none"
              />
              <p className="text-[10px] text-[var(--text-3)]">
                The record is kept and hidden from the grid. This action is
                logged under {staff?.name || "your account"}.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setVoidTarget(null)}
                className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVoid}
                disabled={!voidReason.trim() || voidBusy}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
              >
                {voidBusy
                  ? "Working..."
                  : canDelete
                  ? "Remove Item"
                  : "Void Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Info className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--accent)] uppercase tracking-wider">
            Inventory Intelligence
          </h4>
          <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
            Monitor "Critical" health items closely. Accurate inventory tracking
            prevents downtime during peak photobooth events and ensures you
            never run out of premium supplies.
          </p>
        </div>
      </div>
    </div>
  );
}
