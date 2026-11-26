"use client";

import React from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, eyebrow, badge }) => {
  return (
    <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <nav aria-label="Você está em" className="mb-1 text-sm text-theme-muted">
            {eyebrow}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-theme-text sm:text-[1.75rem]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-theme-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
};