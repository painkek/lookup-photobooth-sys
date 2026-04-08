import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Calendar,
  Package as PackageIcon,
  DollarSign,
  CreditCard,
  X,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * DarkVeil Sales Component
 * Aesthetic: Deep obsidian backgrounds, glassmorphism tables, glowing interactive elements, and vibrant status indicators.
 */
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
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" />
      </div>
    );
  }

  const SummaryCard = ({ title, value, colorClass, prefix = "" }) => (
    <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-4 transition-all hover:border-white/10">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {title}
      </p>
      <p className={`text-xl font-semibold tracking-tight ${colorClass}`}>
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Sales Transactions
          </h2>
          <p className="text-slate-400">
            Manage operations for{" "}
            <span className="text-purple-400 font-medium">{branch.name}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSale(null);
            resetForm();
            setShowModal(true);
          }}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold overflow-hidden transition-all hover:bg-purple-500 active:scale-95 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
        >
          <Plus className="w-4 h-4" /> Record New Sale
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Today's Sales"
          value={todaySales}
          prefix="₱"
          colorClass="text-emerald-400"
        />
        <SummaryCard
          title="Total Revenue"
          value={totalRevenue}
          prefix="₱"
          colorClass="text-blue-400"
        />
        <SummaryCard
          title="Printing Errors"
          value={totalErrors}
          colorClass="text-red-400"
        />
        <SummaryCard
          title="Avg Transaction"
          value={sales.length ? (totalRevenue / sales.length).toFixed(0) : 0}
          prefix="₱"
          colorClass="text-purple-400"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-[#121214]/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
          <input
            type="text"
            placeholder="Search transactions by customer or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#121214]/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Customer
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Product
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                  Qty
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Total
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Payment
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {sale.sale_date}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-200">
                    {sale.customer_name || "Walk-in"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {sale.product}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 text-center">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-400">
                    ₱{sale.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 uppercase">
                      {sale.payment_method === "gcash" ? (
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      ) : (
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                      )}
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {sale.has_error ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleView(sale)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(sale)}
                        className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-white">
                  {sale.customer_name || "Walk-in"}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {sale.sale_date}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleView(sale)}
                  className="p-2 text-slate-400"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(sale)}
                  className="p-2 text-slate-400"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(sale)}
                  className="p-2 text-red-400/70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase">
                  Product
                </p>
                <p className="text-xs text-slate-300">
                  {sale.product} x{sale.quantity}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase">
                  Total
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  ₱{sale.total_amount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Price List */}
      <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-6">
          Product Price List
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <div
              key={product.name}
              className="group p-4 bg-white/5 border border-white/5 rounded-2xl text-center hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
            >
              <p className="text-xs font-bold text-slate-500 uppercase mb-2 group-hover:text-purple-400">
                {product.name}
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">
                ₱{product.price}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Record/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white">
                {editingSale ? "Edit Transaction" : "New Transaction"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={editingSale ? handleUpdate : handleSubmit}
              className="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) =>
                      setFormData({ ...formData, sale_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Product
                  </label>
                  <select
                    value={formData.product}
                    onChange={(e) =>
                      setFormData({ ...formData, product: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#1a1a1c] border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} - ₱{p.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["cash", "gcash", "card"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, payment_method: method })
                      }
                      className={`py-2 rounded-xl border text-xs font-bold uppercase transition-all ${
                        formData.payment_method === method
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.has_error
                        ? "bg-red-500 border-red-500"
                        : "bg-white/5 border-white/10 group-hover:border-red-500/50"
                    }`}
                  >
                    {formData.has_error && (
                      <X className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.has_error}
                    onChange={(e) =>
                      setFormData({ ...formData, has_error: e.target.checked })
                    }
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Report Printing Error
                  </span>
                </label>
              </div>

              {formData.has_error && (
                <div className="space-y-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Error Type
                    </label>
                    <select
                      value={formData.error_type}
                      onChange={(e) =>
                        setFormData({ ...formData, error_type: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[#1a1a1c] border border-red-500/20 rounded-xl text-white focus:ring-2 focus:ring-red-500/50 outline-none"
                    >
                      <option value="">Select error type</option>
                      {errorTypes.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Notes
                    </label>
                    <textarea
                      value={formData.error_notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          error_notes: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-white/5 border border-red-500/20 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500/50 outline-none"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-white">
                  ₱
                  {(
                    products.find((p) => p.name === formData.product).price *
                    formData.quantity
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20"
                >
                  {editingSale ? "Update Record" : "Complete Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackageIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                Transaction Details
              </h3>
              <p className="text-slate-500 text-sm">
                Receipt for {viewingSale.customer_name || "Walk-in"}
              </p>
            </div>

            <div className="space-y-4">
              {[
                { label: "Date", value: viewingSale.sale_date },
                {
                  label: "Product",
                  value: `${viewingSale.product} x${viewingSale.quantity}`,
                },
                { label: "Price per Unit", value: `₱${viewingSale.price}` },
                {
                  label: "Payment",
                  value: viewingSale.payment_method,
                  class: "uppercase",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-white/5"
                >
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm font-medium text-slate-200 ${
                      item.class || ""
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Total Amount
                </span>
                <span className="text-3xl font-bold text-emerald-400">
                  ₱{viewingSale.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            {viewingSale.has_error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Printing Error
                  Reported
                </p>
                <p className="text-sm text-red-200/80">
                  <span className="text-red-400/60 font-medium">Type:</span>{" "}
                  {viewingSale.error_type}
                </p>
                {viewingSale.error_notes && (
                  <p className="text-sm text-red-200/80 mt-1">
                    <span className="text-red-400/60 font-medium">Notes:</span>{" "}
                    {viewingSale.error_notes}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingSale);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all border border-white/10"
              >
                Edit Record
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
