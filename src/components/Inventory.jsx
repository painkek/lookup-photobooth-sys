import React, { useState, useEffect } from "react";
import {
  Package,
  AlertCircle,
  Edit,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * DarkVeil Inventory Component
 * Aesthetic: Deep obsidian backgrounds, glassmorphism cards, glowing stock indicators, and vibrant status alerts.
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

export default function Inventory({ branch }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
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

  useEffect(() => {
    fetchInventory();
  }, [branch]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("branch_id", branch.id)
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
    }));
    const { error } = await supabase.from("inventory").insert(defaultItems);
    if (!error) fetchInventory();
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    const newQuantity = selectedItem.quantity + parseInt(formData.quantity);
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity, updated_at: new Date() })
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
        updated_at: new Date(),
      })
      .eq("id", selectedItem.id);

    if (!error) {
      setShowEditItemModal(false);
      setSelectedItem(null);
      fetchInventory();
    }
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Delete ${item.item_name}?`)) {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", item.id);
      if (!error) fetchInventory();
    }
  };

  const handleUpdateThreshold = async (item, newThreshold) => {
    const { error } = await supabase
      .from("inventory")
      .update({ low_stock_threshold: newThreshold })
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
    <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5 transition-all hover:border-white/10">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {title}
          </p>
          <p className={`text-2xl font-semibold tracking-tight ${colorClass}`}>
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Inventory
          </h2>
          <p className="text-slate-400">
            Stock management for{" "}
            <span className="text-purple-400 font-medium">{branch.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchInventory()}
            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
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
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">
              Critical Stock Alerts
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {outOfStockItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <span className="text-sm font-bold text-red-200">
                  {item.item_name}{" "}
                  <span className="text-[10px] text-red-400 ml-1 opacity-60">
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
                  <span className="text-sm font-bold text-amber-200">
                    {item.item_name}{" "}
                    <span className="text-[10px] text-amber-400 ml-1 opacity-60">
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
          colorClass="text-white"
        />
        <StatCard
          title="Total Value"
          value={totalValue}
          prefix="₱"
          icon={TrendingUp}
          colorClass="text-emerald-400"
        />
        <StatCard
          title="Low Stock"
          value={lowStockItems.length}
          icon={TrendingDown}
          colorClass="text-amber-400"
        />
        <StatCard
          title="Last Restocked"
          value={
            lastRestocked
              ? new Date(lastRestocked).toLocaleDateString()
              : "Never"
          }
          icon={RefreshCw}
          colorClass="text-blue-400"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-[#121214]/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
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
              className="group relative bg-[#121214]/60 border border-white/5 rounded-3xl p-6 transition-all hover:border-white/10 hover:bg-[#121214]/80"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/5 group-hover:border-purple-500/30 transition-colors">
                    {itemInfo?.icon || "📦"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white tracking-tight">
                      {item.item_name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {item.item_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {item.quantity}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {item.unit}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      Stock Health
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isLowStock
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {isLowStock ? "Critical" : "Optimal"}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isLowStock ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 italic">
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
                    className="flex-1 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Set Threshold
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
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
        <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-16 text-center backdrop-blur-sm">
          <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No items found</h3>
          <p className="text-slate-500 text-sm">
            Add items to start tracking your inventory stock levels.
          </p>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
            onClick={() => setShowRestockModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white">Restock Item</h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRestock} className="space-y-6">
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    {selectedItem.item_name}
                  </p>
                  <p className="text-sm text-slate-300">
                    Current Stock:{" "}
                    <span className="text-white font-bold">
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-xl font-bold focus:ring-2 focus:ring-purple-500/50 outline-none"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                  rows="2"
                  placeholder="Supplier, Batch #, etc."
                />
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  New Stock Level
                </span>
                <span className="text-2xl font-bold text-white">
                  {selectedItem.quantity + (parseInt(formData.quantity) || 0)}{" "}
                  {selectedItem.unit}
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
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

      {/* Tips Section */}
      <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Info className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-purple-200 uppercase tracking-wider">
            Inventory Intelligence
          </h4>
          <p className="text-xs text-purple-200/60 mt-1 leading-relaxed">
            Monitor "Critical" health items closely. Accurate inventory tracking
            prevents downtime during peak photobooth events and ensures you
            never run out of premium supplies.
          </p>
        </div>
      </div>
    </div>
  );
}
