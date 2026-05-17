"use client";

import { useAuth } from "@/lib/context/AuthContext";

export function useRole() {
  return useAuth();
}
