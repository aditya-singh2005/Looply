"use client";

import { useState, useEffect } from "react";
import { Calendar, History, RefreshCw } from "lucide-react";
import { getCurrentDate } from "@/lib/utils/dates";

export function TimeTravelWidget() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [isOverridden, setIsOverridden] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if localhost
    const hostname = window.location.hostname;
    const local = hostname === "localhost" || hostname === "127.0.0.1" || process.env.NODE_ENV === "development";
    setIsLocalHost(local);

    const override = localStorage.getItem("dateOverride");
    setIsOverridden(!!override);

    const d = getCurrentDate();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setCurrentDateStr(`${yyyy}-${mm}-${dd}`);
  }, []);

  if (!mounted || !isLocalHost) return null;

  const handleDateChange = (val: string) => {
    if (!val) return;
    localStorage.setItem("dateOverride", val);
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem("dateOverride");
    window.location.reload();
  };

  const presets = [
    { label: "Q1 Active (Mar 1)", date: "2026-03-01" },
    { label: "Q2 Active (Jun 1)", date: "2026-06-01" },
    { label: "Q3 Active (Sep 1)", date: "2026-09-01" },
    { label: "Q4 Active (Nov 15)", date: "2026-11-15" },
  ];

  return (
    <div className="mb-4 px-2 lg:px-3">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-2 lg:p-3 shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isOverridden ? "bg-amber-500" : "bg-emerald-500"}`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isOverridden ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1">
              <History className="h-3 w-3 text-warning" />
              Time Travel
            </span>
          </div>
          {isOverridden && (
            <button
              onClick={handleReset}
              className="text-[10px] font-bold uppercase text-warning hover:text-warning-hover flex items-center gap-0.5 hover:underline"
              title="Reset to Actual Time"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Reset
            </button>
          )}
        </div>

        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <input
              type="date"
              value={currentDateStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-transparent text-xs font-mono font-semibold text-text-primary focus:outline-none cursor-pointer hover:text-primary transition-colors"
            />
          </div>
        </div>

        <div className="mt-2.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full text-left text-[9px] font-bold uppercase tracking-wide text-text-muted hover:text-primary transition-colors flex items-center justify-between"
          >
            <span>Quick Quarters</span>
            <span>{isOpen ? "▲" : "▼"}</span>
          </button>

          {isOpen && (
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.date}
                  onClick={() => handleDateChange(preset.date)}
                  className={`rounded px-1 py-0.5 text-left text-[9px] font-medium transition-all ${
                    currentDateStr === preset.date
                      ? "bg-warning text-white"
                      : "bg-surface hover:bg-surface-hover text-text-secondary"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
