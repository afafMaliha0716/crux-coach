"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { GYM } from "@/lib/seed";
import { useAppState } from "@/lib/store";
import { ExamplePill } from "./ui";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/history/", label: "History" },
  { href: "/profile/", label: "Profile" },
];

export function Wordmark() {
  return (
    <span className="wordmark flex items-center gap-2 text-24 text-ink">
      <span
        aria-hidden="true"
        className="hold"
        style={{ width: 20, height: 17, background: "var(--accent)", border: 0, transform: "rotate(-12deg)" }}
      />
      Crux
    </span>
  );
}

/** Applies the saved theme to the document. Light is the default: gyms are bright. */
export function useTheme() {
  const { state, ready } = useAppState();
  useEffect(() => {
    if (ready) document.documentElement.dataset.theme = state.theme;
  }, [ready, state.theme]);
}

/** The frame around every climber screen: header, one column, bottom tabs. */
export function AppShell({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  useTheme();
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.slice(0, -1)));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-5">
        <Wordmark />
        <p className="text-right text-13 text-muted">
          {GYM.name} <ExamplePill>example gym</ExamplePill>
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-6">{children}</main>

      {tabs && (
        <nav aria-label="Main" className="sticky bottom-0 flex border-t border-line bg-bg">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active(tab.href) ? "page" : undefined}
              className={`flex h-14 flex-1 items-center justify-center text-15 ${active(tab.href) ? "font-semibold text-ink" : "text-muted"}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
