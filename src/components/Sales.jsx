import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Printer,
  Calendar,
  User,
  Package as PackageIcon,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const products = [
  { name: "Snapshot", price: 150, description: "Snapshot" },
  { name: "Two Strips", price: 200, description: "Two strips" },
  { name: "One strip", price: 250, description: "One strip" },
  { name: "Reprint", price: 100, description: "Reprint" },
  { name: "Ministrips", price: 200, description: "Ministrips" },
  { name: "Keychain", price: 30, description: "Keychain" },
];

const errorTypes = [
  "Paper Jam",
  "Out of Paper",
  "Low Ink",
  "Print Head Issue",
  "Color Mismatch",
  "Photo Alignment",
  "Software Error",
  "Connection Lost",
  "Other",
];

export default function Sales({ branch }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    product: "Snapshot",
    quantity: 1,
    payment_method: "cash",
    has_error: false,
    error_type: "",
    error_notes: "",
    sale_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchSales();
  }, [branch]);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("branch_id", branch.id)
      .order("sale_date", { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_name: sale.customer_name || "",
      product: sale.product,
      quantity: sale.quantity,
      payment_method: sale.payment_method,
      has_error: sale.has_error || false,
      error_type: sale.error_type || "",
      error_notes: sale.error_notes || "",
      sale_date: sale.sale_date,
    });
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const selectedProduct = products.find((p) => p.name === formData.product);
    const total = selectedProduct.price * formData.quantity;

    const saleData = {
      customer_name: formData.customer_name,
      product: formData.product,
      quantity: formData.quantity,
      price: selectedProduct.price,
      total_amount: total,
      payment_method: formData.payment_method,
      has_error: formData.has_error,
      error_type: formData.has_error ? formData.error_type : null,
      error_notes: formData.has_error ? formData.error_notes : null,
      sale_date: formData.sale_date,
    };

    const { error } = await supabase
      .from("sales")
      .update(saleData)
      .eq("id", editingSale.id);

    if (error) {
      alert("Error updating sale: " + error.message);
    } else {
      alert(`Sale Updated Successfully!`);
      setShowModal(false);
      setEditingSale(null);
      resetForm();
      fetchSales();
    }
  };

  const handleDelete = async (sale) => {
    if (
      window.confirm(
        `Are you sure you want to delete the sale for ${
          sale.customer_name || "Walk-in"
        }?`
      )
    ) {
      const { error } = await supabase.from("sales").delete().eq("id", sale.id);
      if (error) {
        alert("Error deleting sale: " + error.message);
      } else {
        alert("Sale deleted successfully!");
        fetchSales();
      }
    }
  };

  const handleView = (sale) => {
    setViewingSale(sale);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedProduct = products.find((p) => p.name === formData.product);
    const total = selectedProduct.price * formData.quantity;

    const saleData = {
      branch_id: branch.id,
      customer_name: formData.customer_name,
      product: formData.product,
      quantity: formData.quantity,
      price: selectedProduct.price,
      total_amount: total,
      payment_method: formData.payment_method,
      has_error: formData.has_error,
      error_type: formData.has_error ? formData.error_type : null,
      error_notes: formData.has_error ? formData.error_notes : null,
      sale_date: formData.sale_date,
    };

    const { error } = await supabase.from("sales").insert([saleData]);

    if (error) {
      alert("Error recording sale: " + error.message);
    } else {
      alert(`Sale Recorded Successfully!`);
      setShowModal(false);
      resetForm();
      fetchSales();
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      product: "Snapshot",
      quantity: 1,
      payment_method: "cash",
      has_error: false,
      error_type: "",
      error_notes: "",
      sale_date: new Date().toISOString().split("T")[0],
    });
  };

  const todaySales = sales
    .filter((s) => s.sale_date === new Date().toISOString().split("T")[0])
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalErrors = sales.filter((s) => s.has_error).length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);

  const filteredSales = sales.filter(
    (sale) =>
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.product?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-10">Loading sales data...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Sales Transactions
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Manage sales for {branch.name}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSale(null);
            resetForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Record Sale
        </button>
      </div>

      {/* Summary Cards - Mobile friendly grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
          <p className="text-xs text-gray-600">Today's Sales</p>
          <p className="text-lg md:text-2xl font-bold text-green-600">
            ₱{todaySales.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
          <p className="text-xs text-gray-600">Total Revenue</p>
          <p className="text-lg md:text-2xl font-bold text-blue-600">
            ₱{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
          <p className="text-xs text-gray-600">Printing Errors</p>
          <p className="text-lg md:text-2xl font-bold text-red-600">
            {totalErrors}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
          <p className="text-xs text-gray-600">Avg Transaction</p>
          <p className="text-lg md:text-2xl font-bold text-purple-600">
            ₱{sales.length ? (totalRevenue / sales.length).toFixed(0) : 0}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Mobile: Card View, Desktop: Table View */}
      {/* Mobile View (visible on small screens) */}
      <div className="block md:hidden space-y-3">
        {filteredSales.map((sale) => (
          <div key={sale.id} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {sale.customer_name || "Walk-in"}
                </p>
                <p className="text-xs text-gray-500">{sale.sale_date}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(sale)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(sale)}
                  className="text-green-600 hover:text-green-800 p-1"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(sale)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Product:</span>
                <span className="text-sm font-medium">
                  {sale.product} x{sale.quantity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-base font-bold text-green-600">
                  ₱{sale.total_amount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment:</span>
                <span className="text-sm capitalize">
                  {sale.payment_method}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                {sale.has_error ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Error
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredSales.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            No sales recorded yet. Click "Record Sale" to get started!
          </div>
        )}
      </div>

      {/* Desktop Table View (visible on medium screens and up) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
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
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sale.sale_date}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sale.customer_name || "Walk-in"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sale.product}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">
                    ₱{sale.total_amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {sale.payment_method}
                  </td>
                  <td className="px-6 py-4">
                    {sale.has_error ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Error
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(sale)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(sale)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    No sales recorded yet. Click "Record Sale" to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Sale Modal - Mobile optimized */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white rounded-lg p-5 max-w-md w-full my-4">
            <h3 className="text-lg font-bold mb-3">
              {editingSale ? "Edit Sale" : "Record New Sale"}
            </h3>
            <form
              onSubmit={editingSale ? handleUpdate : handleSubmit}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Date
                </label>
                <input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) =>
                    setFormData({ ...formData, sale_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  value={formData.product}
                  onChange={(e) =>
                    setFormData({ ...formData, product: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {products.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.name} - ₱{product.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div className="border-t pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_error}
                    onChange={(e) =>
                      setFormData({ ...formData, has_error: e.target.checked })
                    }
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Report Printing Error
                  </span>
                </label>
              </div>

              {formData.has_error && (
                <div className="space-y-3 pl-4 border-l-2 border-red-300">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Error Type
                    </label>
                    <select
                      value={formData.error_type}
                      onChange={(e) =>
                        setFormData({ ...formData, error_type: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">Select error type</option>
                      {errorTypes.map((error) => (
                        <option key={error} value={error}>
                          {error}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional details about the error..."
                      value={formData.error_notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          error_notes: e.target.value,
                        })
                      }
                      rows="2"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-purple-600">
                    ₱
                    {(
                      products.find((p) => p.name === formData.product).price *
                      formData.quantity
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm"
                >
                  {editingSale ? "Update Sale" : "Complete Sale"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSale(null);
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Sale Modal - Mobile optimized */}
      {showViewModal && viewingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg p-5 max-w-md w-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Sale Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm text-gray-500">Date:</span>
                <span className="text-sm font-medium">
                  {viewingSale.sale_date}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm text-gray-500">Customer:</span>
                <span className="text-sm font-medium">
                  {viewingSale.customer_name || "Walk-in"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm text-gray-500">Product:</span>
                <span className="text-sm font-medium">
                  {viewingSale.product} x{viewingSale.quantity}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm text-gray-500">Total Amount:</span>
                <span className="text-lg font-bold text-purple-600">
                  ₱{viewingSale.total_amount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm text-gray-500">Payment Method:</span>
                <span className="text-sm font-medium capitalize">
                  {viewingSale.payment_method}
                </span>
              </div>
              {viewingSale.has_error && (
                <div className="bg-red-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Printing Error
                  </p>
                  <p className="text-sm">Type: {viewingSale.error_type}</p>
                  {viewingSale.error_notes && (
                    <p className="text-sm">Notes: {viewingSale.error_notes}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingSale);
                }}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                Edit Sale
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Price List - Mobile friendly grid */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3">
          Product Price List
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="text-center p-2 md:p-3 bg-gray-50 rounded-lg"
            >
              <p className="text-xs md:text-sm font-medium text-gray-900">
                {product.name}
              </p>
              <p className="text-base md:text-2xl font-bold text-purple-600">
                ₱{product.price}
              </p>
              <p className="text-xs text-gray-500 hidden md:block">
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
