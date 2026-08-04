import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Ban,
  Calendar,
  Package as PackageIcon,
  DollarSign,
  X,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { todayLocal } from "../lib/dates";

/**
 * Sales Component — Module 1: identity + audit trail
 * - Every record stamps created_by / updated_by (staff on shift)
 * - Staff VOID (reason required, row kept); managers/owners soft-delete
 * - Voided and deleted rows are excluded from all lists and totals
 */
const products = [
  { name: "Snapshot", price: 150, description: "Snapshot" },
  { name: "Two Strips", price: 200, description: "Two strips" },
  { name: "One strip", price: 250, description: "One strip" },
  { name: "Reprint", price: 100, description: "Reprint" },
  { name: "Ministrips", price: 250, description: "Ministrips" },
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

export default function Sales({ branch, staff }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null); // sale being voided/removed
  const [voidReason, setVoidReason] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    product: "Snapshot",
    quantity: 1,
    payment_method: "cash",
    has_error: false,
    error_type: "",
    error_notes: "",
    sale_date: todayLocal(),
  });

  // Managers and owners may remove a record outright (soft delete).
  // Staff may only void — the row stays, flagged, with a reason.
  const canDelete = staff?.role === "owner" || staff?.role === "manager";

  useEffect(() => {
    fetchSales();
  }, [branch]);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("branch_id", branch.id)
      .eq("is_deleted", false)
      .is("voided_at", null)
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
      updated_by: staff?.id || null,
      updated_at: new Date().toISOString(),
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
      created_by: staff?.id || null,
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
      .from("sales")
      .update(payload)
      .eq("id", voidTarget.id);

    setVoidBusy(false);

    if (error) {
      alert("Could not complete: " + error.message);
      return;
    }
    setVoidTarget(null);
    setVoidReason("");
    fetchSales();
  };

  const handleView = (sale) => {
    setViewingSale(sale);
    setShowViewModal(true);
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
      sale_date: todayLocal(),
    });
  };

  const todaySales = sales
    .filter((s) => s.sale_date === todayLocal())
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
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-b-green-500 animate-spin" />
      </div>
    );
  }

  const SummaryCard = ({ title, value, colorClass, prefix = "" }) => (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 transition-all hover:border-[var(--border-hover)]">
      <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
        {title}
      </p>
      <p
        className={`text-lg md:text-xl font-semibold tracking-tight truncate ${colorClass}`}
      >
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
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Sales Transactions
          </h2>
          <p className="text-[var(--text-2)]">
            Manage operations for{" "}
            <span className="text-[var(--accent)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSale(null);
            resetForm();
            setShowModal(true);
          }}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold overflow-hidden transition-all hover:bg-green-500 active:scale-95 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
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
          colorClass="text-[var(--success)]"
        />
        <SummaryCard
          title="Total Revenue"
          value={totalRevenue}
          prefix="₱"
          colorClass="text-[var(--info)]"
        />
        <SummaryCard
          title="Printing Errors"
          value={totalErrors}
          colorClass="text-[var(--danger)]"
        />
        <SummaryCard
          title="Avg Transaction"
          value={sales.length ? (totalRevenue / sales.length).toFixed(0) : 0}
          prefix="₱"
          colorClass="text-[var(--accent)]"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl p-4">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input
            type="text"
            placeholder="Search transactions by customer or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--chip-bg)]">
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Customer
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Product
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest text-center">
                  Qty
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Total
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Payment
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="group hover:bg-[var(--chip-bg)] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-[var(--text-2)]">
                    {sale.sale_date}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[var(--text-1)]">
                    {sale.customer_name || "Walk-in"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-2)]">
                    {sale.product}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-2)] text-center">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-[var(--success)]">
                    ₱{sale.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--chip-bg)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-2)] uppercase">
                      {sale.payment_method === "gcash" ? (
                        <CheckCircle2 className="w-3 h-3 text-[var(--info)]" />
                      ) : (
                        <DollarSign className="w-3 h-3 text-[var(--success)]" />
                      )}
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {sale.has_error ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-[var(--danger)] text-[10px] font-bold uppercase border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[var(--success)] text-[10px] font-bold uppercase border border-emerald-500/20">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleView(sale)}
                        className="p-2 text-[var(--text-3)] hover:text-[var(--info)] hover:bg-blue-400/10 rounded-lg transition-all"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(sale)}
                        className="p-2 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-green-400/10 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setVoidTarget(sale);
                          setVoidReason("");
                        }}
                        className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-red-400/10 rounded-lg transition-all"
                        title={canDelete ? "Remove record" : "Void sale"}
                      >
                        {canDelete ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
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
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-1)] truncate">
                  {sale.customer_name || "Walk-in"}
                </p>
                <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                  {sale.sale_date}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleView(sale)}
                  className="p-2 text-[var(--text-3)]"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(sale)}
                  className="p-2 text-[var(--text-3)]"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setVoidTarget(sale);
                    setVoidReason("");
                  }}
                  className="p-2 text-[var(--danger)] opacity-70"
                >
                  {canDelete ? (
                    <Trash2 className="w-4 h-4" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                  Product
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  {sale.product} x{sale.quantity}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                  Total
                </p>
                <p className="text-sm font-bold text-[var(--success)]">
                  ₱{sale.total_amount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Price List */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-6">
          Product Price List
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <div
              key={product.name}
              className="group p-4 bg-[var(--chip-bg)] border border-[var(--border)] rounded-2xl text-center hover:border-green-500/30 hover:bg-green-500/5 transition-all"
            >
              <p className="text-xs font-bold text-[var(--text-3)] uppercase mb-2 group-hover:text-[var(--accent)]">
                {product.name}
              </p>
              <p className="text-2xl font-bold text-[var(--text-1)] tracking-tight">
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
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--chip-bg)]">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-1)]">
                  {editingSale ? "Edit Transaction" : "New Transaction"}
                </h3>
                {staff && (
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)] mt-0.5">
                    Recording as {staff.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
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
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
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
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-green-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) =>
                      setFormData({ ...formData, sale_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-green-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    Product
                  </label>
                  <select
                    value={formData.product}
                    onChange={(e) =>
                      setFormData({ ...formData, product: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-green-500/50 outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} - ₱{p.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
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
                    className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-green-500/50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
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
                          ? "bg-green-600 border-green-500 text-white"
                          : "bg-[var(--chip-bg)] border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--chip-bg-hover)]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.has_error
                        ? "bg-red-500 border-red-500"
                        : "bg-[var(--chip-bg)] border-[var(--border-hover)] group-hover:border-red-500/50"
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
                  <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                    Report Printing Error
                  </span>
                </label>
              </div>

              {formData.has_error && (
                <div className="space-y-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-widest">
                      Error Type
                    </label>
                    <select
                      value={formData.error_type}
                      onChange={(e) =>
                        setFormData({ ...formData, error_type: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[var(--select-bg)] border border-red-500/20 rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-red-500/50 outline-none"
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
                    <label className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-widest">
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
                      className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-red-500/20 rounded-xl text-[var(--text-1)] text-sm focus:ring-2 focus:ring-red-500/50 outline-none"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--success)] uppercase tracking-wider">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-[var(--text-1)]">
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
                  className="flex-1 py-3 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-500/20"
                >
                  {editingSale ? "Update Record" : "Complete Transaction"}
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
                {canDelete ? "Remove Record" : "Void Sale"}
              </h3>
            </div>

            <div className="p-4 bg-[var(--chip-bg)] border border-[var(--border)] rounded-2xl mb-5">
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {voidTarget.customer_name || "Walk-in"} — {voidTarget.product} x
                {voidTarget.quantity}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                {voidTarget.sale_date} · ₱
                {voidTarget.total_amount.toLocaleString()}
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
                placeholder="e.g. wrong product selected, customer cancelled"
                className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm placeholder:text-[var(--text-3)] focus:ring-2 focus:ring-red-500/50 outline-none"
              />
              <p className="text-[10px] text-[var(--text-3)]">
                The record is kept and excluded from totals. This action is
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
                  ? "Remove Record"
                  : "Void Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackageIcon className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-1)]">
                Transaction Details
              </h3>
              <p className="text-[var(--text-3)] text-sm">
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
                  className="flex justify-between items-center py-2 border-b border-[var(--border)]"
                >
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm font-medium text-[var(--text-1)] ${
                      item.class || ""
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-4">
                <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-widest">
                  Total Amount
                </span>
                <span className="text-3xl font-bold text-[var(--success)]">
                  ₱{viewingSale.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            {viewingSale.has_error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-xs font-bold text-[var(--danger)] uppercase tracking-widest flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Printing Error
                  Reported
                </p>
                <p className="text-sm text-[var(--text-2)]">
                  <span className="text-[var(--danger)] opacity-70 font-medium">
                    Type:
                  </span>{" "}
                  {viewingSale.error_type}
                </p>
                {viewingSale.error_notes && (
                  <p className="text-sm text-[var(--text-2)] mt-1">
                    <span className="text-[var(--danger)] opacity-70 font-medium">
                      Notes:
                    </span>{" "}
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
                className="flex-1 py-3 bg-[var(--chip-bg)] hover:bg-[var(--chip-bg-hover)] text-[var(--text-1)] rounded-xl font-bold text-sm transition-all border border-[var(--border-hover)]"
              >
                Edit Record
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-500/20"
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
