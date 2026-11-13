import React from "react";

export interface FrostedGlassIconProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
  surface?: "auto" | "dark" | "light";
  active?: boolean;
}

/**
 * Ladrilho de vidro fosco reutilizável para ícones principais da interface.
 * - Desfoque de fundo (backdrop-filter) de 10-12 px
 * - Raio de canto de 12-14 px
 * - Destaque translúcido na borda superior (inset highlight)
 * - Sombra interna sutil
 * - Amostragem do fundo através do ladrilho (diferença sutil sobre petróleo vs azul-noite)
 * - Traço do ícone nítido em camada separada de primeiro plano
 * - Ícone neutro claro no vidro escuro; ícone petróleo escuro no vidro claro
 */
export default function FrostedGlassIcon({
  icon: Icon,
  size = "md",
  className = "",
  iconClassName = "",
  surface = "auto",
  active = false,
}: FrostedGlassIconProps) {
  const sizeClasses = {
    sm: "h-9 w-9 min-w-[36px] rounded-[12px]",
    md: "h-11 w-11 min-w-[44px] rounded-[13px]",
    lg: "h-14 w-14 min-w-[56px] rounded-[14px]",
  }[size];

  const iconSizes = {
    sm: "h-[18px] w-[18px]",
    md: "h-[22px] w-[22px]",
    lg: "h-7 w-7",
  }[size];

  // Cores do traço:
  // - dark: neutro brilhante (#EFF7F6)
  // - light: petróleo escuro (#0E5B55 / #04635F)
  // - auto: alterna automaticamente com o tema (claro -> petróleo escuro; escuro -> neutro claro)
  const colorClass = {
    auto: active
      ? "text-theme-teal dark:text-theme-teal"
      : "text-[#0E5B55] dark:text-[#EFF7F6]",
    dark: active ? "text-brand-300" : "text-[#EFF7F6]",
    light: active ? "text-[#0E5B55]" : "text-[#0E5B55]",
  }[surface];

  return (
    <div
      aria-hidden="true"
      className={`glass-tile inline-flex select-none items-center justify-center transition-[background-color,border-color,box-shadow,transform] duration-200 ${sizeClasses} ${
        active
          ? "border-theme-teal/60 bg-theme-teal-subtle/40 shadow-[0_0_14px_-2px_rgb(var(--accent-teal)/0.35)]"
          : ""
      } ${className}`}
    >
      {/* Camada nítida em primeiro plano separada do desfoque de fundo */}
      <span className={`relative z-10 flex items-center justify-center ${colorClass} ${iconClassName}`}>
        <Icon className={iconSizes} aria-hidden="true" />
      </span>
    </div>
  );
}
