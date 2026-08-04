import React, { useState } from "react";
import { ShieldCheck, Users, Delete, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase"; // adjust path if your client lives elsewhere

const ROLE_GROUPS = [
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "staff", label: "Staff", icon: Users },
];

/**
 * StaffSelect — shown after branch login, before the app.
 * Flow: tap Admin or Staff -> enter 4-digit PIN -> onSelect(staffRow)
 * The tile only narrows which role bucket gets checked; the PIN itself is
 * what actually identifies who's logging in (and gets clocked in).
 */
export default function StaffSelect({ branch, onSelect }) {
  const [roleGroup, setRoleGroup] = useState(null); // 'admin' | 'staff' | null
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(false);

  async function verifyPin(nextPin) {
    setVerifying(true);
    setError(false);

    const { data, error: rpcError } = await supabase.rpc(
      "verify_staff_pin_by_role",
      {
        p_branch_id: branch.id,
        p_role_group: roleGroup,
        p_pin: nextPin,
      }
    );

    if (rpcError || !data || data.length === 0) {
      setVerifying(false);
      setError(true);
      setPin("");
      return;
    }

    const staffRow = data[0];

    // Best-effort clock-in -- if this fails, still let them in rather than
    // blocking the whole login on a shift-tracking hiccup.
    const { error: clockInError } = await supabase.rpc("clock_in_staff", {
      p_staff_id: staffRow.id,
    });
    if (clockInError) {
      console.error("Clock-in failed:", clockInError);
    }

    setVerifying(false);
    onSelect(staffRow); // { id, branch_id, name, role }
  }

  function pressDigit(d) {
    if (verifying) return;
    setError(false);
    setPin((p) => {
      const next = p.length < 4 ? p + d : p;
      if (next.length === 4) verifyPin(next);
      return next;
    });
  }

  function backspace() {
    if (verifying) return;
    setError(false);
    setPin((p) => p.slice(0, -1));
  }

  function backToRoles() {
    setRoleGroup(null);
    setPin("");
    setError(false);
  }

  const activeGroup = ROLE_GROUPS.find((g) => g.value === roleGroup);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-2)] flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-8">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)] font-medium mb-1">
              {branch.name}
            </p>
            <h1 className="text-xl font-semibold text-[var(--text-1)]">
              {activeGroup ? `${activeGroup.label} Access` : "Who's on shift?"}
            </h1>
          </div>

          {!roleGroup && (
            <div className="grid grid-cols-2 gap-3">
              {ROLE_GROUPS.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.value}
                    onClick={() => setRoleGroup(g.value)}
                    className="group flex flex-col items-center gap-3 px-4 py-7 rounded-2xl border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-purple-500/10 hover:border-purple-500/20 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--chip-bg)] flex items-center justify-center group-hover:bg-purple-500/15">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-sm tracking-wide">
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {roleGroup && (
            <div className="flex flex-col items-center">
              {/* PIN dots */}
              <div
                className={`flex gap-4 mb-8 ${error ? "animate-pulse" : ""}`}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                      error
                        ? "bg-[var(--danger)] border-[var(--danger)]"
                        : i < pin.length
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "border-[var(--border-hover)]"
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-[var(--danger)] mb-4 -mt-4">
                  Wrong PIN — try again
                </p>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => pressDigit(d)}
                    disabled={verifying}
                    className="aspect-square rounded-2xl border border-[var(--border)] text-lg font-medium text-[var(--text-1)] hover:bg-[var(--chip-bg)] hover:border-purple-500/20 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={backToRoles}
                  disabled={verifying}
                  className="aspect-square rounded-2xl flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors disabled:opacity-40"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => pressDigit("0")}
                  disabled={verifying}
                  className="aspect-square rounded-2xl border border-[var(--border)] text-lg font-medium text-[var(--text-1)] hover:bg-[var(--chip-bg)] hover:border-purple-500/20 active:scale-95 transition-all disabled:opacity-40"
                >
                  0
                </button>
                <button
                  onClick={backspace}
                  disabled={verifying}
                  className="aspect-square rounded-2xl flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors disabled:opacity-40"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {verifying && (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-3)] mt-6" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
