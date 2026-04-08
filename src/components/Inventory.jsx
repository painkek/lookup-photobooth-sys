import React, { useState, useEffect } from "react";
import {
  Package,
  AlertCircle,
  Edit,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// REMOVED "frame" from this list
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
  // REMOVED: frame item
];

export default function Inventory({ branch }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    quantity: "",
    notes: "",
  });
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

  // Fetch inventory from Supabase
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
      alert("Error loading inventory: " + error.message);
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

    if (error) {
      console.error("Error creating default inventory:", error);
    } else {
      fetchInventory();
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();

    const newQuantity = selectedItem.quantity + parseInt(formData.quantity);

    const { error } = await supabase
      .from("inventory")
      .update({
        quantity: newQuantity,
        updated_at: new Date(),
      })
      .eq("id", selectedItem.id);

    if (error) {
      alert("Error updating inventory: " + error.message);
    } else {
      alert(`Successfully restocked ${selectedItem.item_name}!
     
Added: ${formData.quantity} ${selectedItem.unit}
New Total: ${newQuantity} ${selectedItem.unit}
${formData.notes ? `Notes: ${formData.notes}` : ""}`);

      setShowRestockModal(false);
      setSelectedItem(null);
      setFormData({ quantity: "", notes: "" });
      fetchInventory();
    }
  };

  // ADD THIS FUNCTION - Handle Edit Item
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditFormData({
      item_name: item.item_name,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
    });
    setShowEditItemModal(true);
  };

  // ADD THIS FUNCTION - Handle Update Item
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

    if (error) {
      alert("Error updating item: " + error.message);
    } else {
      alert(`Successfully updated ${selectedItem.item_name}!
     
New Name: ${editFormData.item_name}
Unit: ${editFormData.unit}
Threshold: ${editFormData.low_stock_threshold}`);

      setShowEditItemModal(false);
      setSelectedItem(null);
      fetchInventory();
    }
  };

  // ADD THIS FUNCTION - Handle Delete Item
  const handleDeleteItem = async (item) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${item.item_name} from inventory?`
      )
    ) {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", item.id);

      if (error) {
        alert("Error deleting item: " + error.message);
      } else {
        alert(`${item.item_name} deleted successfully!`);
        fetchInventory();
      }
    }
  };

  const handleUpdateThreshold = async (item, newThreshold) => {
    const { error } = await supabase
      .from("inventory")
      .update({ low_stock_threshold: newThreshold })
      .eq("id", item.id);

    if (error) {
      alert("Error updating threshold: " + error.message);
    } else {
      fetchInventory();
    }
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

    if (error) {
      alert("Error adding item: " + error.message);
    } else {
      alert(`Successfully added new item!
     
Item: ${newItemData.item_name}
Quantity: ${newItemData.quantity} ${newItemData.unit}
Threshold: ${newItemData.low_stock_threshold}`);

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

  // Calculate summary stats - REMOVED frame from avgPrice
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
    ) {
      return item.updated_at;
    }
    return latest;
  }, null);

  // Filter inventory
  const filteredInventory = inventory.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Inventory Management
          </h2>
          <p className="text-gray-600 mt-1">
            Track and manage supplies for {branch.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchInventory()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Low Stock & Out of Stock Warnings */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {outOfStockItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-2 bg-red-100 rounded"
              >
                <span className="font-medium text-red-800">
                  ⚠️ {item.item_name}
                </span>
                <span className="text-red-800 font-bold">OUT OF STOCK!</span>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowRestockModal(true);
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Restock Now
                </button>
              </div>
            ))}
            {lowStockItems
              .filter((item) => item.quantity > 0)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-2 bg-orange-100 rounded"
                >
                  <span className="font-medium text-orange-800">
                    ⚠️ {item.item_name}
                  </span>
                  <span className="text-orange-800">
                    Only {item.quantity} {item.unit} left (Threshold:{" "}
                    {item.low_stock_threshold})
                  </span>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                  >
                    Restock
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                ₱{totalValue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-orange-600">
                {lowStockItems.length}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Restocked</p>
              <p className="text-lg font-bold text-gray-900">
                {lastRestocked
                  ? new Date(lastRestocked).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Inventory Grid - Updated with Edit and Delete buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => {
          const isLowStock = item.quantity <= item.low_stock_threshold;
          const stockPercentage = Math.min(
            (item.quantity / item.low_stock_threshold) * 100,
            100
          );
          const itemInfo = inventoryItems.find(
            (i) => i.type === item.item_type
          );

          return (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{itemInfo?.icon || "📦"}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {item.item_name}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {item.item_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Edit button - opens edit modal */}
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-green-600 hover:text-green-800"
                    title="Edit Item"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    {item.quantity}
                  </span>
                  <span className="text-sm text-gray-600">{item.unit}</span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Stock Level</span>
                    <span
                      className={
                        isLowStock
                          ? "text-red-600 font-medium"
                          : "text-green-600"
                      }
                    >
                      {isLowStock ? "Low Stock" : "Good"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isLowStock ? "bg-red-600" : "bg-green-600"
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Threshold: {item.low_stock_threshold} {item.unit}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <button
                    onClick={() => {
                      const newThreshold = prompt(
                        "Enter new low stock threshold:",
                        item.low_stock_threshold
                      );
                      if (newThreshold && !isNaN(newThreshold)) {
                        handleUpdateThreshold(item, parseInt(newThreshold));
                      }
                    }}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Set Threshold
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                  >
                    + Restock
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No inventory items found
          </h3>
          <p className="text-gray-500">
            Click "Add Item" to start tracking your inventory.
          </p>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                Restock {selectedItem.item_name}
              </h3>
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestock} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-medium">
                    {selectedItem.quantity} {selectedItem.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Threshold:</span>
                  <span className="font-medium">
                    {selectedItem.low_stock_threshold} {selectedItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Supplier name, purchase order #, etc."
                />
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">New Stock Level:</span>
                  <span className="text-xl font-bold text-green-600">
                    {selectedItem.quantity + (parseInt(formData.quantity) || 0)}{" "}
                    {selectedItem.unit}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Confirm Restock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal - NEW */}
      {showEditItemModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                Edit {selectedItem.item_name}
              </h3>
              <button
                onClick={() => {
                  setShowEditItemModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={editFormData.unit}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, unit: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Update Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItemModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add New Inventory Item</h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type
                </label>
                <select
                  value={newItemData.item_type}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      item_type: e.target.value,
                      unit:
                        inventoryItems.find((i) => i.type === e.target.value)
                          ?.unit || "pieces",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {inventoryItems.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
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
                  placeholder="e.g., Premium Photo Paper"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newItemData.quantity}
                  onChange={(e) =>
                    setNewItemData({ ...newItemData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={newItemData.unit}
                  onChange={(e) =>
                    setNewItemData({ ...newItemData, unit: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newItemData.low_stock_threshold}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      low_stock_threshold: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">
              Inventory Management Tips
            </h3>
            <p className="text-sm text-green-800 mt-1">
              • Restock items when they reach the threshold to avoid running out
              <br />
              • Regular inventory counts help maintain accuracy
              <br />
              • Track which items sell fastest to optimize stock levels
              <br />• Keep emergency stock for peak seasons and events
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
