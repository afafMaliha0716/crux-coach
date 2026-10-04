"use client";

import { FOCUS_AREAS } from "@/lib/catalog";
import type { ClimberProfile } from "@/lib/types";
import { Chip, Select, TextField } from "./ui";

export const GRADES = [0, 1, 2, 3, 4, 5, 6];

export function HeightField({ value, onChange }: { value: number; onChange: (inches: number) => void }) {
  const feet = Math.floor(value / 12);
  const inches = value % 12;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Select label="Feet" value={feet} onChange={(e) => onChange(Number(e.target.value) * 12 + inches)}>
        {[4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n} ft
          </option>
        ))}
      </Select>
      <Select label="Inches" value={inches} onChange={(e) => onChange(feet * 12 + Number(e.target.value))}>
        {Array.from({ length: 12 }, (_, n) => (
          <option key={n} value={n}>
            {n} in
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ApeField({ value, onChange }: { value: number; onChange: (ape: number) => void }) {
  return (
    <TextField
      label="Ape index, in inches"
      type="number"
      inputMode="numeric"
      min={-4}
      max={6}
      step={1}
      value={value}
      onChange={(e) => onChange(Math.max(-4, Math.min(6, Math.round(Number(e.target.value) || 0))))}
      hint="Arm span minus height. Measure fingertip to fingertip with your arms out, then subtract your height. Leave 0 if you're not sure."
    />
  );
}

export function GradeField({ value, onChange }: { value: number; onChange: (grade: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {GRADES.map((grade) => (
        <Chip key={grade} selected={value === grade} onClick={() => onChange(grade)}>
          <span className="num">V{grade}</span>
        </Chip>
      ))}
    </div>
  );
}

export function FocusField({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FOCUS_AREAS.map((area) => {
        const on = value.includes(area.id);
        return (
          <Chip
            key={area.id}
            selected={on}
            onClick={() => onChange(on ? value.filter((id) => id !== area.id) : [...value, area.id])}
          >
            {area.label}
          </Chip>
        );
      })}
    </div>
  );
}

export const DEFAULT_PROFILE: ClimberProfile = { heightIn: 64, apeIn: 0, grade: 2, focusAreas: [] };
