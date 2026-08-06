import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  Trash2,
  Ban,
  Eye,
  Clock,
  User,
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Schedule Component — Module 1: identity + audit trail
 * Standard 3-hour bookings + multi-day pop-up events.
 *
 * Note: `status` (pending/confirmed/cancelled/completed) is a business
 * state the booking already tracks — "cancelled" means the customer
 * cancelled, and stays visible. Void/Remove below is a different thing:
 * correcting a mistaken entry (wrong booking, duplicate). Staff void
 * (reason required, row kept); managers/owners soft-delete.
 */
const eventTypes = [
  { value: "birthday", label: "Birthday", icon: "🎂" },
  { value: "wedding", label: "Wedding", icon: "💒" },
  { value: "corporate", label: "Corporate", icon: "🏢" },
  { value: "party", label: "Party", icon: "🎉" },
  { value: "school", label: "School", icon: "🏫" },
  { value: "establishment", label: "Establishment", icon: "🏬" },
  { value: "other", label: "Other", icon: "📸" },
];

const timeMap = {
  "9:00 AM": "09:00",
  "10:00 AM": "10:00",
  "11:00 AM": "11:00",
  "12:00 PM": "12:00",
  "1:00 PM": "13:00",
  "2:00 PM": "14:00",
  "3:00 PM": "15:00",
  "4:00 PM": "16:00",
  "5:00 PM": "17:00",
  "6:00 PM": "18:00",
  "7:00 PM": "19:00",
  "8:00 PM": "20:00",
  "9:00 PM": "21:00",
  "10:00 PM": "22:00",
  "11:00 PM": "23:00",
};

const reverseTimeMap = Object.fromEntries(
  Object.entries(timeMap).map(([k, v]) => [v, k])
);

const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const t = time24.slice(0, 5); // handles "14:00:00" from Postgres TIME
  return reverseTimeMap[t] || t;
};

const emptyForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  event_type: "birthday",
  package: "High Angle Photobooth",
  booking_type: "standard",
  date: "",
  end_date: "",
  start_time: "14:00",
  end_time: "17:00",
  additional_hours: 0,
  has_floor_fee: false,
  floor_number: "",
  transportation_fee: 0,
  location: "",
  total_amount: 8500,
  notes: "",
  status: "pending",
};

// Shared theme class strings
const inputCls =
  "w-full px-4 py-3 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:ring-2 focus:ring-purple-500/50 outline-none";
const selectCls =
  "w-full px-4 py-3 bg-[var(--select-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] focus:ring-2 focus:ring-purple-500/50 outline-none";
const label =
  "text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest";

export default function Schedule({ branch, staff }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [totalPrice, setTotalPrice] = useState(8500);
  const [formData, setFormData] = useState(emptyForm);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);

  // Managers and owners may remove a booking outright (soft delete).
  // Staff may only void — the row stays, flagged, with a reason.
  const canDelete = staff?.role === "owner" || staff?.role === "manager";

  useEffect(() => {
    if (branch?.id) fetchBookings();
  }, [branch]);

  // Auto-pricing only applies to the standard 3-hour package.
  // Pop-up events use a manually entered quoted amount.
  useEffect(() => {
    if (formData.booking_type === "popup") return;
    let total =
      8500 +
      formData.additional_hours * 1500 +
      (formData.has_floor_fee ? 150 : 0) +
      (Number(formData.transportation_fee) || 0);
    setTotalPrice(total);
    setFormData((prev) => ({ ...prev, total_amount: total }));
  }, [
    formData.booking_type,
    formData.additional_hours,
    formData.has_floor_fee,
    formData.transportation_fee,
  ]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("branch_id", branch.id)
      .eq("is_deleted", false)
      .is("voided_at", null)
      .order("date")
      .order("start_time");
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bookingData = {
      ...formData,
      branch_id: branch.id,
      booking_type: formData.booking_type === "popup" ? "popup" : "standard",
      // Only pop-ups can span multiple days; standard bookings never save end_date
      end_date:
        formData.booking_type === "popup" ? formData.end_date || null : null,
      // Keep package consistent with booking type
      package:
        formData.booking_type === "popup"
          ? "Pop-Up Booth"
          : "High Angle Photobooth",
    };
    let error;
    if (editingBooking) {
      const { error: err } = await supabase
        .from("schedules")
        .update({
          ...bookingData,
          updated_by: staff?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingBooking.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("schedules")
        .insert([{ ...bookingData, created_by: staff?.id || null }]);
      error = err;
    }
    if (error) {
      alert("Booking not saved: " + error.message);
      return;
    }
    setShowModal(false);
    fetchBookings();
  };

  const handleEdit = (b) => {
    setEditingBooking(b);
    setFormData({
      ...emptyForm,
      ...b,
      booking_type: b.booking_type || "standard",
      end_date: b.end_date || "",
      start_time: b.start_time ? b.start_time.slice(0, 5) : "14:00",
      end_time: b.end_time ? b.end_time.slice(0, 5) : "17:00",
    });
    setTotalPrice(b.total_amount || 8500);
    setShowModal(true);
  };

  const handleNewBooking = (prefillDate) => {
    setEditingBooking(null);
    setFormData({ ...emptyForm, date: prefillDate || "" });
    setTotalPrice(8500);
    setShowModal(true);
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
      .from("schedules")
      .update(payload)
      .eq("id", voidTarget.id);

    setVoidBusy(false);

    if (error) {
      alert("Could not complete: " + error.message);
      return;
    }
    setVoidTarget(null);
    setVoidReason("");
    fetchBookings();
  };

  // Built from local date parts on purpose — toISOString() converts to
  // UTC first, which shifts every date back a day in UTC+8 (Philippines):
  // local midnight Aug 7 becomes "2026-08-06" once converted to UTC.
  // That was causing the calendar's "today" highlight and every booking
  // marker to land one cell later than the actual date.
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const changeMonth = (inc) =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + inc, 1)
    );

  const getDaysInMonth = (date) => {
    const year = date.getFullYear(),
      month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = Array(firstDay).fill(null);
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++)
      days.push(new Date(year, month, i));
    return days;
  };

  // A booking occupies a calendar day if the day falls within its date range.
  // Multi-day pop-ups (with end_date) appear on every day they span.
  const bookingCoversDay = (b, dayStr) =>
    b.date <= dayStr && (b.end_date || b.date) >= dayStr;

  const todayStr = formatDateForInput(new Date());
  const upcomingBookings = bookings.filter(
    (b) =>
      (b.end_date || b.date) >= todayStr &&
      b.status !== "cancelled" &&
      (b.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed"
  ).length;
  const totalRevenue = bookings
    .filter((b) => ["completed", "confirmed"].includes(b.status))
    .reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-2 border-purple-500/20 border-b-purple-500 rounded-full animate-spin" />
      </div>
    );

  const StatCard = ({ title, value, colorClass, prefix = "" }) => (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 transition-all hover:border-[var(--border-hover)]">
      <p className={`${label} mb-1`}>{title}</p>
      <p className={`text-xl font-semibold tracking-tight ${colorClass}`}>
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">
            Schedule
          </h2>
          <p className="text-[var(--text-2)]">
            Booking management for{" "}
            <span className="text-[var(--accent)] font-medium">
              {branch.name}
            </span>
          </p>
        </div>
        <button
          onClick={() => handleNewBooking()}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold transition-all hover:bg-blue-500 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming"
          value={upcomingBookings.length}
          colorClass="text-[var(--info)]"
        />
        <StatCard
          title="Confirmed"
          value={confirmedCount}
          colorClass="text-[var(--success)]"
        />
        <StatCard
          title="Pending"
          value={bookings.filter((b) => b.status === "pending").length}
          colorClass="text-[var(--warn)]"
        />
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          prefix="₱"
          colorClass="text-[var(--text-1)]"
        />
      </div>

      {/* Calendar */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-[var(--text-1)]">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-4 py-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-all"
            >
              TODAY
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
            <div
              key={idx}
              className="bg-[var(--chip-bg)] py-2 md:py-3 text-center text-[10px] font-bold text-[var(--text-3)] tracking-widest"
            >
              <span className="md:hidden">{d}</span>
              <span className="hidden md:inline">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][idx]}
              </span>
            </div>
          ))}
          {getDaysInMonth(currentMonth).map((date, i) => {
            const dayStr = date ? formatDateForInput(date) : null;
            const dayBookings = date
              ? bookings.filter(
                  (b) => bookingCoversDay(b, dayStr) && b.status !== "cancelled"
                )
              : [];
            const isToday = date && dayStr === todayStr;
            return (
              <div
                key={i}
                className={`min-h-[52px] md:min-h-[100px] p-1 md:p-2 bg-[var(--card-bg)] transition-colors ${
                  date
                    ? "hover:bg-[var(--chip-bg)] cursor-pointer"
                    : "opacity-20"
                }`}
                onClick={() => date && handleNewBooking(dayStr)}
              >
                {date && (
                  <>
                    <span
                      className={`inline-flex w-6 h-6 md:w-7 md:h-7 items-center justify-center rounded-full text-[11px] md:text-xs font-bold ${
                        isToday
                          ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
                          : "text-[var(--text-3)]"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* Mobile: compact dots */}
                    <div className="mt-1 flex flex-wrap items-center gap-1 md:hidden">
                      {dayBookings.slice(0, 3).map((b) => (
                        <span
                          key={b.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.booking_type === "popup"
                              ? "bg-cyan-500"
                              : "bg-green-500"
                          }`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[8px] font-bold text-[var(--text-3)]">
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Desktop: full chips */}
                    <div className="mt-2 space-y-1 hidden md:block">
                      {dayBookings.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold truncate ${
                            b.booking_type === "popup"
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-600"
                              : "bg-green-500/10 border-green-500/20 text-[var(--accent)]"
                          }`}
                        >
                          {b.booking_type === "popup"
                            ? "POP-UP • "
                            : `${formatTime12Hour(b.start_time)} • `}
                          {b.customer_name}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-[var(--text-3)] font-bold pl-1">
                          +{dayBookings.length - 2} MORE
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking List */}
      <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-[var(--text-1)]">
            Upcoming Events
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>
        </div>
        <div className="space-y-4">
          {upcomingBookings.map((b) => (
            <div
              key={b.id}
              className="group flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-[var(--border-hover)] transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[var(--chip-bg)] rounded-2xl flex flex-col items-center justify-center border border-[var(--border)] group-hover:border-purple-500/30 transition-colors">
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                    {new Date(b.date).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                  <span className="text-lg font-bold text-[var(--text-1)]">
                    {new Date(b.date).getDate()}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-1)] tracking-tight">
                    {b.customer_name}
                    {b.booking_type === "popup" && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 align-middle">
                        Pop-Up
                      </span>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                      <Clock className="w-3 h-3" />{" "}
                      {b.end_date && b.end_date !== b.date
                        ? `${b.date} → ${b.end_date}`
                        : `${formatTime12Hour(b.start_time)} - ${formatTime12Hour(
                            b.end_time
                          )}`}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                      <MapPin className="w-3 h-3" />{" "}
                      {b.location || "Main Branch"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    b.status === "confirmed"
                      ? "bg-emerald-500/10 text-[var(--success)] border-emerald-500/20"
                      : "bg-amber-500/10 text-[var(--warn)] border-amber-500/20"
                  }`}
                >
                  {b.status}
                </span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => {
                      setViewingBooking(b);
                      setShowViewModal(true);
                    }}
                    className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--chip-bg)] rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(b)}
                    className="p-2 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-purple-400/10 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setVoidTarget(b);
                      setVoidReason("");
                    }}
                    className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-red-400/10 rounded-lg transition-all"
                    title={canDelete ? "Remove booking" : "Void booking"}
                  >
                    {canDelete ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal - Booking Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--chip-bg)]">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-1)]">
                  {editingBooking ? "Edit Booking" : "New Booking"}
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
              onSubmit={handleSubmit}
              className="p-8 space-y-6 max-h-[80vh] overflow-y-auto"
            >
              {/* Booking Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={label}>Booking Type</label>
                  <select
                    value={formData.booking_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        booking_type: e.target.value,
                        event_type:
                          e.target.value === "popup" ? "school" : "birthday",
                      })
                    }
                    className={selectCls}
                  >
                    <option value="standard"> Standard - 3 hours events  </option>
                    <option value="popup">
                      Pop-up events
                    </option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={label}>Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) =>
                      setFormData({ ...formData, event_type: e.target.value })
                    }
                    className={selectCls}
                  >
                    {eventTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={label}>Customer Name</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={label}>
                    {formData.booking_type === "popup" ? "Start Date" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Pop-up only: end date + quoted amount */}
              {formData.booking_type === "popup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className={label}>End Date (Multi-Day)</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      min={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      className={inputCls}
                    />
                    <p className="text-[10px] text-[var(--text-3)]">
                      Leave blank if single-day.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className={label}>Quoted Amount (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.total_amount}
                      onChange={(e) => {
                        const amt = Number(e.target.value) || 0;
                        setTotalPrice(amt);
                        setFormData({ ...formData, total_amount: amt });
                      }}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={label}>Start Time</label>
                  <select
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className={selectCls}
                  >
                    {Object.entries(timeMap).map(([lbl, val]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={label}>End Time</label>
                  <select
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className={selectCls}
                  >
                    {Object.entries(timeMap).map(([lbl, val]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={label}>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder={
                    formData.booking_type === "popup"
                      ? "e.g. School gym, mall activity center"
                      : "Event venue"
                  }
                  className={inputCls}
                />
              </div>

              <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--accent)] uppercase tracking-wider">
                  Total Amount
                </span>
                <span className="text-3xl font-bold text-[var(--text-1)]">
                  ₱{totalPrice.toLocaleString()}
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
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  Confirm Booking
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
                {canDelete ? "Remove Booking" : "Void Booking"}
              </h3>
            </div>

            <div className="p-4 bg-[var(--chip-bg)] border border-[var(--border)] rounded-2xl mb-5">
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {voidTarget.customer_name}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                {voidTarget.date}
                {voidTarget.end_date && voidTarget.end_date !== voidTarget.date
                  ? ` → ${voidTarget.end_date}`
                  : ""}{" "}
                · ₱{Number(voidTarget.total_amount || 0).toLocaleString()}
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
                placeholder="e.g. duplicate entry, wrong date entered"
                className="w-full px-4 py-2.5 bg-[var(--chip-bg)] border border-[var(--border)] rounded-xl text-[var(--text-1)] text-sm placeholder:text-[var(--text-3)] focus:ring-2 focus:ring-red-500/50 outline-none"
              />
              <p className="text-[10px] text-[var(--text-3)]">
                Use "Cancelled" status for a customer cancelling — this is for
                correcting a mistaken entry. The record is kept and logged
                under {staff?.name || "your account"}.
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
                  ? "Remove Booking"
                  : "Void Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--modal-bg)] border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-1)]">
                {viewingBooking.customer_name}
              </h3>
              <p className="text-[var(--text-3)] text-sm uppercase tracking-widest font-bold mt-1">
                {viewingBooking.booking_type === "popup" ? "Pop-Up • " : ""}
                {viewingBooking.event_type}
              </p>
            </div>
            <div className="space-y-4 border-t border-[var(--border)] pt-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Date & Time
                </span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {viewingBooking.end_date &&
                  viewingBooking.end_date !== viewingBooking.date
                    ? `${viewingBooking.date} → ${viewingBooking.end_date}`
                    : `${viewingBooking.date} • ${formatTime12Hour(
                        viewingBooking.start_time
                      )}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {viewingBooking.location || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Total Amount
                </span>
                <span className="text-lg font-bold text-[var(--success)]">
                  ₱{Number(viewingBooking.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-8 py-3 bg-[var(--chip-bg)] hover:bg-[var(--chip-bg-hover)] text-[var(--text-1)] rounded-xl font-bold text-sm border border-[var(--border-hover)] transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
