"use client";

import React from "react";
import ThemeSelector from "./ThemeSelector";
import VisualEffectsToggle from "./VisualEffectsToggle";

/** Controles de aparência sempre alcançáveis em páginas sem o header público (login, solicitação, status). */
export default function AppearanceBar() {
  return (
    <div className="w-full flex justify-end px-4 pt-4 sm:px-6 sm:absolute sm:top-0 sm:right-0 sm:w-auto">
      <div className="flex items-center gap-2">
        <ThemeSelector compact />
        <VisualEffectsToggle compact />
      </div>
    </div>
  );
}
