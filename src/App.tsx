import type { ReactNode } from "react";
import { GYM_NAME } from "./lib/seed";
import { go, useRoute } from "./router";
import { Members, Revenue, StaffScreen } from "./screens/admin";
import { AttemptScreen, History, Onboarding, ProfileScreen, Today } from "./screens/climber";
import { ClimberDetail, CoachToday, Roster } from "./screens/coach";
import { RouteDetail, Wall } from "./screens/setter";
import { useStore } from "./store";

type Role = "climber" | "coach" | "setter" | "admin";

const NAV: Record<Role, { path: string; label: string }[]> = {
  climber: [
    { path: "today", label: "Today" },
    { path: "attempt", label: "Attempt" },
    { path: "history", label: "History" },
    { path: "profile", label: "Profile" },
  ],
  coach: [
    { path: "today", label: "Today" },
    { path: "roster", label: "Roster" },
  ],
  setter: [{ path: "wall", label: "Wall" }],
  admin: [
    { path: "members", label: "Members" },
    { path: "revenue", label: "Revenue" },
    { path: "staff", label: "Staff" },
  ],
};

const ROLE_LABEL: Record<Role, string> = { climber: "Climber", coach: "Coach", setter: "Setter", admin: "Gym admin" };

function Mark() {
  return (
    <a className="mark" href="#/climber/today" aria-label="Crux home">
      <span className="dot" style={{ background: "var(--accent)", width: 22, height: 19, border: 0 }} aria-hidden="true" />
      Crux
    </a>
  );
}

export function App() {
  const parts = useRoute();
  const { me, resetDemo } = useStore();
  const role: Role = (["climber", "coach", "setter", "admin"] as const).includes(parts[0] as Role) ? (parts[0] as Role) : "climber";
  const screen = parts[1] ?? NAV[role][0].path;
  const id = parts[2] ?? "";
  const onboarding = role === "climber" && !me.onboarded;

  let body: ReactNode;
  if (onboarding) body = <Onboarding />;
  else if (role === "climber") body = screen === "attempt" ? <AttemptScreen /> : screen === "history" ? <History /> : screen === "profile" ? <ProfileScreen /> : <Today />;
  else if (role === "coach") body = screen === "roster" ? <Roster /> : screen === "climber" ? <ClimberDetail id={id} /> : <CoachToday />;
  else if (role === "setter") body = screen === "route" ? <RouteDetail id={id} /> : <Wall />;
  else body = screen === "revenue" ? <Revenue /> : screen === "staff" ? <StaffScreen /> : <Members />;

  const current = screen === "climber" ? "today" : screen === "route" ? "wall" : screen;
  return (
    <div className={"shell" + (role === "climber" ? "" : "")}>
      <header className="top">
        <Mark />
        <span className="gym">
          {GYM_NAME} <span className="pill">demo gym</span>
        </span>
        <label className="role" htmlFor="role">
          Viewing as
          <select id="role" className="input" style={{ width: "auto", padding: "6px 8px" }} value={role} onChange={(e) => go(e.target.value + "/" + NAV[e.target.value as Role][0].path)}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </header>
      {!onboarding && (
        <nav className="tabs" aria-label={ROLE_LABEL[role]}>
          {NAV[role].map((n) => (
            <a key={n.path} href={`#/${role}/${n.path}`} aria-current={current === n.path ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      )}
      <main style={onboarding ? { paddingTop: 24 } : undefined}>{body}</main>
      <footer className="foot">
        <span style={{ maxWidth: "70ch" }}>
          <b>What is live here:</b> the session, the movement measurements and the coach flags are computed as you use the app. The gym, its routes, the other climbers and the
          written beta are example data. Video is analyzed on this device and is not uploaded.
        </span>
        <button
          className="btn"
          type="button"
          onClick={() => {
            resetDemo();
            go("climber/today");
          }}
        >
          Reset demo
        </button>
      </footer>
    </div>
  );
}
