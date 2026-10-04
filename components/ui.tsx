"use client";

import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `primary` is the one accent button a screen is allowed. */
  variant?: "primary" | "quiet";
  full?: boolean;
};

export function Button({ variant = "quiet", full, className = "", ...props }: ButtonProps) {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-fg border-accent"
      : "bg-surface text-ink border-line";
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-[12px] border px-5 text-15 font-semibold disabled:opacity-50 ${look} ${full ? "w-full" : ""} ${className}`}
    />
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const look = selected ? "bg-ink text-bg border-ink" : "bg-surface text-ink border-line";
  if (!onClick) {
    return (
      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-13 ${selected ? "border-ink text-ink font-medium" : "border-line text-muted"}`}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center rounded-full border px-4 text-15 font-medium ${look}`}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[12px] border border-line bg-surface p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-10 flex-1 rounded-[8px] text-15 font-medium ${value === option.value ? "bg-ink text-bg" : "text-body"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={`flex flex-col gap-1 text-13 text-muted ${className}`}>
      {label}
      <select
        {...props}
        className="h-12 rounded-[8px] border border-line bg-surface px-3 text-15 text-ink"
      >
        {children}
      </select>
    </label>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-13 text-muted">
      {label}
      <input
        {...props}
        className="num h-12 rounded-[8px] border border-line bg-surface px-3 text-15 text-ink"
      />
      {hint && <span>{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line px-5 py-8 text-center">
      <p className="text-18 font-semibold text-ink">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

/** Marks seed or sample data so it is never mistaken for the real thing. */
export function ExamplePill({ children = "example" }: { children?: ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2 py-px align-middle text-13 text-muted">
      {children}
    </span>
  );
}

export function ListRow({ children }: { children: ReactNode }) {
  return <li className="flex items-center gap-3 border-b border-line py-4 last:border-b-0">{children}</li>;
}
