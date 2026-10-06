import { useState } from "react";
import { Example, HeightGrade } from "../components/ui";
import type { Staff } from "../lib/types";
import { useStore } from "../store";

const DAY = 24 * 60 * 60 * 1000;
const money = (n: number) => "$" + n.toLocaleString("en-US");

function activeIds(attempts: { climberId: string; at: number }[], now: number): Set<string> {
  return new Set(attempts.filter((a) => now - a.at <= 30 * DAY).map((a) => a.climberId));
}

export function Members() {
  const { state, setMember } = useStore();
  const now = Date.now();
  const active = activeIds(state.attempts, now);
  const members = state.profiles.filter((p) => p.member);
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Members</h1>
        <p>
          <span className="mono">{members.length}</span> members have Crux. <span className="mono">{members.filter((p) => active.has(p.id)).length}</span> logged an attempt in
          the last 30 days.
        </p>
      </div>
      <div className="list">
        {state.profiles.map((p) => (
          <div key={p.id} className="row between">
            <span className="row">
              <span className="who">{p.name}</span>
              {p.example && <Example />}
              <HeightGrade heightIn={p.heightIn} grade={p.grade} />
            </span>
            <label className="row small" htmlFor={`member-${p.id}`}>
              <span className="muted">{p.member ? (active.has(p.id) ? "Active this month" : "No attempts this month") : "No Crux add-on"}</span>
              <input id={`member-${p.id}`} type="checkbox" checked={p.member} onChange={(e) => setMember(p.id, e.target.checked)} aria-label={`${p.name} has Crux`} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Revenue() {
  const { state, setPrices } = useStore();
  const now = Date.now();
  const active = activeIds(state.attempts, now);
  const n = state.profiles.filter((p) => p.member && active.has(p.id)).length;
  const { member, crux } = state.prices;
  const [scale, setScale] = useState(200);
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Revenue</h1>
        <p>Members pay the gym for Crux. The gym pays Crux for each member who was active that month. Both prices are working assumptions you can change.</p>
      </div>
      <div className="row">
        <label className="field" htmlFor="price-member" style={{ width: 200 }}>
          Member pays, per month ($)
          <input id="price-member" type="number" min={0} max={200} value={member} onChange={(e) => setPrices({ member: Number(e.target.value) || 0, crux })} />
        </label>
        <label className="field" htmlFor="price-crux" style={{ width: 200 }}>
          Gym pays Crux, per active member ($)
          <input id="price-crux" type="number" min={0} max={200} value={crux} onChange={(e) => setPrices({ member, crux: Number(e.target.value) || 0 })} />
        </label>
      </div>
      <section className="stack tight">
        <h2>
          This month, from the demo roster <Example />
        </h2>
        <div className="sums">
          <div className="card">
            <span className="count">{money(n * member)}</span>
            <span>
              collected from <span className="mono">{n}</span> active members
            </span>
          </div>
          <div className="card">
            <span className="count">{money(n * crux)}</span>
            <span>owed to Crux</span>
          </div>
          <div className="card">
            <span className="count">{money(n * (member - crux))}</span>
            <span>kept by the gym</span>
          </div>
        </div>
      </section>
      <section className="stack tight">
        <h2>What it looks like at scale</h2>
        <label className="field" htmlFor="scale" style={{ maxWidth: 420 }}>
          <span>
            If <span className="mono">{scale}</span> members had Crux
          </span>
          <input id="scale" type="range" min={25} max={1000} step={25} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ padding: 0, accentColor: "var(--accent)" }} />
        </label>
        <div className="sums">
          <div className="card">
            <span className="count">{money(scale * member)}</span>
            <span>collected per month</span>
          </div>
          <div className="card">
            <span className="count">{money(scale * crux)}</span>
            <span>to Crux</span>
          </div>
          <div className="card">
            <span className="count">{money(scale * (member - crux))}</span>
            <span>kept by the gym</span>
          </div>
        </div>
        <p className="small muted">A projection from the two prices above, not a forecast of demand.</p>
      </section>
    </div>
  );
}

export function StaffScreen() {
  const { state, addStaff, removeStaff } = useStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Staff["role"]>("coach");
  const label = { coach: "Coach", setter: "Setter", admin: "Gym admin" } as const;
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Staff</h1>
        <p>Coaches see flags and send notes. Setters manage the wall. Admins see members and revenue.</p>
      </div>
      <div className="list">
        {state.staff.map((s) => (
          <div key={s.id} className="row between">
            <span className="row">
              <span className="who">{s.name}</span>
              {s.example && <Example />}
            </span>
            <span className="row small">
              <span className="muted">{label[s.role]}</span>
              <button className="btn quiet" type="button" onClick={() => removeStaff(s.id)} aria-label={`Remove ${s.name}`}>
                Remove
              </button>
            </span>
          </div>
        ))}
      </div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          addStaff(name.trim(), role);
          setName("");
        }}
      >
        <h2>Add a staff member</h2>
        <div className="row">
          <label className="field grow" htmlFor="staff-name" style={{ flexBasis: 220 }}>
            Name
            <input id="staff-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" htmlFor="staff-role" style={{ width: 160 }}>
            Role
            <select id="staff-role" value={role} onChange={(e) => setRole(e.target.value as Staff["role"])}>
              <option value="coach">Coach</option>
              <option value="setter">Setter</option>
              <option value="admin">Gym admin</option>
            </select>
          </label>
        </div>
        <div>
          <button className="btn primary" type="submit" disabled={!name.trim()}>
            Add
          </button>
        </div>
        <span className="small muted">In this demo, staff are added to the list on this device. No invitation email is sent.</span>
      </form>
    </div>
  );
}
