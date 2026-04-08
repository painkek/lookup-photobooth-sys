import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Phone,
  Calendar,
  MapPin,
  Mail,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const eventTypes = [
  {
    value: "birthday",
    label: "Birthday",
    color: "bg-pink-100 text-pink-800",
    icon: "🎂",
  },
  {
    value: "wedding",
    label: "Wedding",
    color: "bg-purple-100 text-purple-800",
    icon: "💒",
  },
  {
    value: "corporate",
    label: "Corporate",
    color: "bg-blue-100 text-blue-800",
    icon: "🏢",
  },
  {
    value: "party",
    label: "Party",
    color: "bg-green-100 text-green-800",
    icon: "🎉",
  },
  {
    value: "other",
    label: "Other",
    color: "bg-gray-100 text-gray-800",
    icon: "📸",
  },
];

const packages = [
  {
    name: "High Angle Photobooth",
    basePrice: 8500,
    duration: 3,
    description: "3 hours high angle photobooth service",
    includes:
      "High angle camera setup, professional lighting, props, instant printing, photo backdrop, online gallery",
  },
];

// Time slots in 12-hour format for display, but store 24-hour in DB
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

// Mapping from 12-hour display to 24-hour storage
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

// Reverse mapping from 24-hour to 12-hour display
const reverseTimeMap = {
  "09:00": "9:00 AM",
  "10:00": "10:00 AM",
  "11:00": "11:00 AM",
  "12:00": "12:00 PM",
  "13:00": "1:00 PM",
  "14:00": "2:00 PM",
  "15:00": "3:00 PM",
  "16:00": "4:00 PM",
  "17:00": "5:00 PM",
  "18:00": "6:00 PM",
  "19:00": "7:00 PM",
  "20:00": "8:00 PM",
  "21:00": "9:00 PM",
  "22:00": "10:00 PM",
  "23:00": "11:00 PM",
};

// Helper function to convert 24-hour to 12-hour display
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  return reverseTimeMap[time24] || time24;
};

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
    calculateTotalPrice();
  }, [
    formData.additional_hours,
    formData.has_floor_fee,
    formData.transportation_fee,
  ]);

  const calculateTotalPrice = () => {
    let total = 8500;
    if (formData.additional_hours > 0) {
      total += formData.additional_hours * 1500;
    }
    if (formData.has_floor_fee) {
      total += 150;
    }
    if (formData.transportation_fee > 0) {
      total += formData.transportation_fee;
    }
    setTotalPrice(total);
    setFormData((prev) => ({ ...prev, total_amount: total }));
  };

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error(err);
      alert("Error fetching bookings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkTimeConflict = async (
    date,
    startTime,
    endTime,
    excludeId = null
  ) => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", branch.id)
        .eq("date", date)
        .neq("status", "cancelled");

      if (error) throw error;

      return data.some((booking) => {
        if (excludeId && booking.id === excludeId) return false;
        const existingStart = booking.start_time;
        const existingEnd = booking.end_time;
        return startTime < existingEnd && endTime > existingStart;
      });
    } catch (err) {
      console.error("Conflict check error:", err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.start_time >= formData.end_time) {
      alert("❌ End time must be after start time!");
      return;
    }

    const hasConflict = await checkTimeConflict(
      formData.date,
      formData.start_time,
      formData.end_time,
      editingBooking?.id
    );

    if (hasConflict) {
      alert(
        "❌ Time slot conflict! This time is already booked. Please choose a different time."
      );
      return;
    }

    try {
      const bookingData = {
        branch_id: branch.id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        customer_email: formData.customer_email || null,
        event_type: formData.event_type,
        package: formData.package,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        additional_hours: formData.additional_hours,
        has_floor_fee: formData.has_floor_fee,
        floor_number: formData.floor_number || null,
        transportation_fee: formData.transportation_fee,
        location: formData.location || null,
        total_amount: formData.total_amount,
        status: editingBooking ? editingBooking.status : "pending",
        notes: formData.notes || null,
      };

      let error;
      if (editingBooking) {
        const { error: updateError } = await supabase
          .from("schedules")
          .update(bookingData)
          .eq("id", editingBooking.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("schedules")
          .insert([bookingData]);
        error = insertError;
      }

      if (error) throw error;

      alert(
        `✅ Booking ${
          editingBooking ? "updated" : "created"
        } successfully!\n\nTotal Amount: ₱${totalPrice.toLocaleString()}`
      );
      setShowModal(false);
      setEditingBooking(null);
      resetForm();
      fetchBookings();
    } catch (err) {
      alert("Failed to save booking: " + err.message);
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone || "",
      customer_email: booking.customer_email || "",
      event_type: booking.event_type,
      package: booking.package,
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      additional_hours: booking.additional_hours || 0,
      has_floor_fee: booking.has_floor_fee || false,
      floor_number: booking.floor_number || "",
      transportation_fee: booking.transportation_fee || 0,
      location: booking.location || "",
      total_amount: booking.total_amount || 8500,
      notes: booking.notes || "",
      status: booking.status,
    });
    setTotalPrice(booking.total_amount || 8500);
    setShowModal(true);
  };

  const handleView = (booking) => {
    setViewingBooking(booking);
    setShowViewModal(true);
  };

  const handleDelete = async (booking) => {
    if (
      window.confirm(
        `Are you sure you want to delete the booking for ${booking.customer_name}?`
      )
    ) {
      try {
        const { error } = await supabase
          .from("schedules")
          .delete()
          .eq("id", booking.id);

        if (error) throw error;
        alert("✅ Booking deleted successfully!");
        fetchBookings();
      } catch (err) {
        alert("Error deleting booking: " + err.message);
      }
    }
  };

  const handleStatusUpdate = async (booking, newStatus) => {
    try {
      const { error } = await supabase
        .from("schedules")
        .update({ status: newStatus })
        .eq("id", booking.id);

      if (error) throw error;
      alert(`✅ Booking ${newStatus} successfully!`);
      fetchBookings();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      event_type: "birthday",
      package: "High Angle Photobooth",
      date: formatDateForInput(new Date()),
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
    setTotalPrice(8500);
  };

  const openModalWithDate = (date) => {
    resetForm();
    setFormData((prev) => ({ ...prev, date: formatDateForInput(date) }));
    setEditingBooking(null);
    setShowModal(true);
  };

  const changeMonth = (inc) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + inc, 1)
    );
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++)
      days.push(new Date(year, month, i));
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const dateStr = formatDateForInput(date);
    return bookings.filter(
      (b) => b.date === dateStr && b.status !== "cancelled"
    );
  };

  const todayStr = formatDateForInput(new Date());
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const upcomingBookings = bookings.filter(
    (b) => b.date >= todayStr && b.status !== "cancelled"
  );
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const totalRevenue = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (b.total_amount || 8500), 0);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.customer_phone && booking.customer_phone.includes(searchTerm));
    const matchesStatus = !statusFilter || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
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
            High Angle Photobooth Schedule
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Manage bookings for {branch.name}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingBooking(null);
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Today's Bookings</p>
          <p className="text-xl md:text-2xl font-bold text-purple-600">
            {todayBookings.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Upcoming</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">
            {upcomingBookings.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Confirmed</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">
            {confirmedBookings.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Pending</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-600">
            {pendingBookings.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-100">
          <p className="text-xs text-gray-600">Total Revenue</p>
          <p className="text-base md:text-2xl font-bold text-green-600">
            ₱{totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Calendar View - Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 overflow-x-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
          <h3 className="text-base md:text-lg font-semibold">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Today
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs md:text-sm font-medium text-gray-600 py-1 md:py-2"
            >
              <span className="hidden md:inline">{day}</span>
              <span className="inline md:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {getDaysInMonth(currentMonth).map((date, index) => {
            const dayBookings = date ? getBookingsForDate(date) : [];
            const isToday = date && formatDateForInput(date) === todayStr;
            return (
              <div
                key={index}
                onClick={() => date && openModalWithDate(date)}
                className={`min-h-[60px] md:min-h-[100px] border rounded-lg p-1 md:p-2 transition cursor-pointer ${
                  isToday
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {date && (
                  <>
                    <div
                      className={`text-right text-xs md:text-sm font-medium mb-1 ${
                        isToday ? "text-purple-600" : "text-gray-600"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                      {dayBookings.slice(0, 2).map((booking) => {
                        const eventType = eventTypes.find(
                          (e) => e.value === booking.event_type
                        );
                        return (
                          <div
                            key={booking.id}
                            className="text-[10px] md:text-xs p-0.5 md:p-1 rounded bg-purple-100 text-purple-700 truncate"
                            title={`${
                              booking.customer_name
                            } - ${formatTime12Hour(booking.start_time)}`}
                          >
                            <span className="hidden md:inline">
                              {formatTime12Hour(booking.start_time)}{" "}
                            </span>
                            {booking.customer_name.split(" ")[0]}
                          </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] md:text-xs text-gray-500 text-center">
                          +{dayBookings.length - 2}
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

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
            }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {filteredBookings.map((booking) => {
          const eventType = eventTypes.find(
            (e) => e.value === booking.event_type
          );
          return (
            <div key={booking.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {booking.customer_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{booking.date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(booking)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(booking)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(booking)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Time:</span>
                  <span className="text-sm">
                    {formatTime12Hour(booking.start_time)} -{" "}
                    {formatTime12Hour(booking.end_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Event:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${eventType?.color}`}
                  >
                    {eventType?.icon} {eventType?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-base font-bold text-green-600">
                    ₱{(booking.total_amount || 8500).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <select
                    value={booking.status}
                    onChange={(e) =>
                      handleStatusUpdate(booking, e.target.value)
                    }
                    className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium ${
                      booking.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : booking.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : booking.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            {bookings.length === 0
              ? "No bookings yet. Click 'New Booking' to get started!"
              : "No bookings match your filters."}
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
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => {
                const eventType = eventTypes.find(
                  (e) => e.value === booking.event_type
                );
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDateForDisplay(booking.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatTime12Hour(booking.start_time)} -{" "}
                      {formatTime12Hour(booking.end_time)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {booking.customer_name}
                      </p>
                      {booking.customer_phone && (
                        <p className="text-xs text-gray-500">
                          {booking.customer_phone}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${eventType?.color}`}
                      >
                        {eventType?.icon} {eventType?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      ₱{(booking.total_amount || 8500).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          handleStatusUpdate(booking, e.target.value)
                        }
                        className={`px-2 py-1 text-xs rounded-full border-0 font-medium ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : booking.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(booking)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(booking)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(booking)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    {bookings.length === 0
                      ? "No bookings yet. Click 'New Booking' to get started!"
                      : "No bookings match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Booking Modal - Mobile Optimized */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white rounded-lg p-5 max-w-2xl w-full my-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-3">
              {editingBooking ? "Edit Booking" : "New Booking"} - High Angle
              Photobooth
            </h3>

            {/* Package Info Banner */}
            <div className="bg-purple-50 p-3 rounded-lg mb-3">
              <p className="font-semibold text-purple-900 text-sm">
                📸 High Angle Photobooth Package
              </p>
              <p className="text-xs text-purple-800">
                Base price: ₱8,500 for 3 hours
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
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
                    className="w-full border p-2 text-sm rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_phone: e.target.value,
                      })
                    }
                    className="w-full border p-2 text-sm rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_email: e.target.value })
                  }
                  className="w-full border p-2 text-sm rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) =>
                      setFormData({ ...formData, event_type: e.target.value })
                    }
                    className="w-full border p-2 text-sm rounded-lg"
                  >
                    {eventTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full border p-2 text-sm rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Full address"
                    required
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    min={formatDateForInput(new Date())}
                    className="w-full border p-2 text-sm rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <select
                    value={
                      reverseTimeMap[formData.start_time] || formData.start_time
                    }
                    onChange={(e) => {
                      const startTime24 = timeMap[e.target.value];
                      const startHour = parseInt(startTime24.split(":")[0]);
                      const endHour =
                        startHour + 3 + parseInt(formData.additional_hours);
                      const endTime24 = `${endHour
                        .toString()
                        .padStart(2, "0")}:00`;
                      setFormData({
                        ...formData,
                        start_time: startTime24,
                        end_time: endTime24,
                      });
                    }}
                    className="w-full border p-2 text-sm rounded-lg"
                    required
                  >
                    {timeSlots12Hour.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={formatTime12Hour(formData.end_time)}
                    className="w-full border p-2 text-sm rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Hours
                  </label>
                  <select
                    value={formData.additional_hours}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      const startHour = parseInt(
                        formData.start_time.split(":")[0]
                      );
                      const endHour = startHour + 3 + hours;
                      setFormData({
                        ...formData,
                        additional_hours: hours,
                        end_time: `${endHour.toString().padStart(2, "0")}:00`,
                      });
                    }}
                    className="w-full border p-2 text-sm rounded-lg"
                  >
                    <option value={0}>0 hours (₱0)</option>
                    <option value={1}>1 hour (₱1,500)</option>
                    <option value={2}>2 hours (₱3,000)</option>
                    <option value={3}>3 hours (₱4,500)</option>
                    <option value={4}>4 hours (₱6,000)</option>
                  </select>
                </div>
              </div>

              {/* Additional Fees */}
              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2">
                  Additional Fees
                </h4>

                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_floor_fee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          has_floor_fee: e.target.checked,
                        })
                      }
                      className="mt-0.5 w-4 h-4 text-purple-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Floor Fee (+₱150)
                      </p>
                      <p className="text-xs text-gray-500">
                        Applies for locations on or above 2nd floor
                      </p>
                    </div>
                  </label>

                  {formData.has_floor_fee && (
                    <div className="ml-6">
                      <input
                        type="text"
                        placeholder="Which floor? (e.g., 2nd Floor)"
                        value={formData.floor_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            floor_number: e.target.value,
                          })
                        }
                        className="w-full border p-2 text-sm rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transportation Fee
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={formData.transportation_fee}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transportation_fee: parseInt(e.target.value) || 0,
                          })
                        }
                        className="flex-1 border p-2 text-sm rounded-lg"
                      />
                      <span className="text-gray-500 text-sm self-center">
                        PHP
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Variable rate - depends on location distance
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Notes / Requests
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows="2"
                  className="w-full border p-2 text-sm rounded-lg"
                  placeholder="Any special requests..."
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-900 text-sm mb-2">
                  Price Breakdown
                </h4>
                <div className="space-y-1 text-xs md:text-sm">
                  <div className="flex justify-between">
                    <span>Base Package (3 hours):</span>
                    <span>₱8,500</span>
                  </div>
                  {formData.additional_hours > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Additional Hours ({formData.additional_hours} hrs):
                      </span>
                      <span>₱{formData.additional_hours * 1500}</span>
                    </div>
                  )}
                  {formData.has_floor_fee && (
                    <div className="flex justify-between">
                      <span>Floor Fee:</span>
                      <span>₱150</span>
                    </div>
                  )}
                  {formData.transportation_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Transportation Fee:</span>
                      <span>₱{formData.transportation_fee}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                    <span>Total Amount:</span>
                    <span className="text-purple-600">
                      ₱{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm"
                >
                  {editingBooking ? "Update Booking" : "Create Booking"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Booking Modal - Mobile Optimized */}
      {showViewModal && viewingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg p-5 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Booking Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 py-1 border-b">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium">
                    {viewingBooking.customer_name}
                  </p>
                </div>
              </div>

              {viewingBooking.customer_phone && (
                <div className="flex items-center gap-2 py-1 border-b">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">
                      {viewingBooking.customer_phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 py-1 border-b">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium">
                    {formatDateForDisplay(viewingBooking.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1 border-b">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium">
                    {formatTime12Hour(viewingBooking.start_time)} -{" "}
                    {formatTime12Hour(viewingBooking.end_time)}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg mt-2">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-purple-600">
                  ₱{(viewingBooking.total_amount || 8500).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingBooking);
                }}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                Edit Booking
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
    </div>
  );
}
