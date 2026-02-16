"use client";

import { useEffect } from "react";
import { suppressLitWarnings } from "@/lib/console-suppressor";

export function ConsoleSuppressionInitializer() {
  useEffect(() => {
    suppressLitWarnings();
  }, []);

  return null;
}
