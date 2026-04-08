import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  X,
  CheckCircle2,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * DarkVeil Schedule Component
 * Aesthetic: Deep obsidian backgrounds, glassmorphism calendar, glowing event indicators, and vibrant status badges.
 */
const eventTypes = [
  {
    value: "birthday",
    label: "Birthday",
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    icon: "🎂",
  },
  {
    value: "wedding",
    label: "Wedding",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: "💒",
  },
  {
    value: "corporate",
    label: "Corporate",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: "🏢",
  },
  {
    value: "party",
    label: "Party",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "🎉",
  },
  {
    value: "other",
    label: "Other",
    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    icon: "📸",
  },
];

const timeSlots12Hour = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
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

const formatTime12Hour = (time24) => reverseTimeMap[time24] || time24;

export default function Schedule({ branch }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [totalPrice, setTotalPrice] = useState(8500);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    event_type: "birthday",
    package: "High Angle Photobooth",
    date: "",
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
  });

  useEffect(() => {
    if (branch?.id) fetchBookings();
  }, [branch]);
  useEffect(() => {
    let total =
      8500 +
      formData.additional_hours * 1500 +
      (formData.has_floor_fee ? 150 : 0) +
      (Number(formData.transportation_fee) || 0);
    setTotalPrice(total);
    setFormData((prev) => ({ ...prev, total_amount: total }));
  }, [
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
      .order("date")
      .order("start_time");
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bookingData = { ...formData, branch_id: branch.id };
    let error;
    if (editingBooking) {
      const { error: err } = await supabase
        .from("schedules")
        .update(bookingData)
        .eq("id", editingBooking.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("schedules")
        .insert([bookingData]);
      error = err;
    }
    if (!error) {
      setShowModal(false);
      fetchBookings();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete booking?")) {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (!error) fetchBookings();
    }
  };

  const formatDateForInput = (date) => date.toISOString().split("T")[0];
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

  const todayStr = formatDateForInput(new Date());
  const upcomingBookings = bookings.filter(
    (b) => b.date >= todayStr && b.status !== "cancelled"
  );
  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed"
  ).length;
  const totalRevenue = bookings
    .filter((b) => ["completed", "confirmed"].includes(b.status))
    .reduce((s, b) => s + (b.total_amount || 0), 0);

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-2 border-purple-500/20 border-b-purple-500 rounded-full animate-spin" />
      </div>
    );

  const StatCard = ({ title, value, colorClass, prefix = "" }) => (
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Schedule
          </h2>
          <p className="text-slate-400">
            Booking management for{" "}
            <span className="text-purple-400 font-medium">{branch.name}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBooking(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:bg-purple-500 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming"
          value={upcomingBookings.length}
          colorClass="text-blue-400"
        />
        <StatCard
          title="Confirmed"
          value={confirmedCount}
          colorClass="text-emerald-400"
        />
        <StatCard
          title="Pending"
          value={bookings.filter((b) => b.status === "pending").length}
          colorClass="text-amber-400"
        />
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          prefix="₱"
          colorClass="text-white"
        />
      </div>

      {/* Calendar */}
      <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-white">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
            >
              TODAY
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div
              key={d}
              className="bg-[#1a1a1c] py-3 text-center text-[10px] font-bold text-slate-500 tracking-widest"
            >
              {d}
            </div>
          ))}
          {getDaysInMonth(currentMonth).map((date, i) => {
            const dayBookings = date
              ? bookings.filter(
                  (b) =>
                    b.date === formatDateForInput(date) &&
                    b.status !== "cancelled"
                )
              : [];
            const isToday = date && formatDateForInput(date) === todayStr;
            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 bg-[#121214]/60 transition-colors ${
                  date ? "hover:bg-white/5 cursor-pointer" : "opacity-20"
                }`}
                onClick={() =>
                  date &&
                  (setFormData((p) => ({
                    ...p,
                    date: formatDateForInput(date),
                  })),
                  setShowModal(true))
                }
              >
                {date && (
                  <>
                    <span
                      className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                          : "text-slate-500"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-2 space-y-1">
                      {dayBookings.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-300 truncate"
                        >
                          {formatTime12Hour(b.start_time)} • {b.customer_name}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-slate-600 font-bold pl-1">
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
      <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">Upcoming Events</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>
        </div>
        <div className="space-y-4">
          {upcomingBookings.map((b) => (
            <div
              key={b.id}
              className="group flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[#121214]/60 border border-white/5 rounded-2xl hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/5 group-hover:border-purple-500/30 transition-colors">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {new Date(b.date).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {new Date(b.date).getDate()}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white tracking-tight">
                    {b.customer_name}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Clock className="w-3 h-3" />{" "}
                      {formatTime12Hour(b.start_time)} -{" "}
                      {formatTime12Hour(b.end_time)}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
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
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(b)}
                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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
            className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white">
                {editingBooking ? "Edit Booking" : "New Booking"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-8 space-y-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Start Time
                  </label>
                  <select
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#1a1a1c] border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  >
                    {Object.entries(timeMap).map(([label, val]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    End Time
                  </label>
                  <select
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#1a1a1c] border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  >
                    {Object.entries(timeMap).map(([label, val]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                  Total Amount
                </span>
                <span className="text-3xl font-bold text-white">
                  ₱{totalPrice.toLocaleString()}
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
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {viewingBooking.customer_name}
              </h3>
              <p className="text-slate-500 text-sm uppercase tracking-widest font-bold mt-1">
                {viewingBooking.event_type}
              </p>
            </div>
            <div className="space-y-4 border-t border-white/5 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Date & Time
                </span>
                <span className="text-sm font-medium text-slate-200">
                  {viewingBooking.date} •{" "}
                  {formatTime12Hour(viewingBooking.start_time)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Location
                </span>
                <span className="text-sm font-medium text-slate-200">
                  {viewingBooking.location || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Total Amount
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  ₱{viewingBooking.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
