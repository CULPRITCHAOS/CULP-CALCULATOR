
import { Value, PendingOp } from '../types';

export function clampInt(s: string): number {
  if (!s) return 0;
  const x = parseInt(s, 10);
  return Number.isFinite(x) ? x : 0;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function roundToNearestFraction(inches: number, denom = 16) {
  const whole = Math.floor(inches);
  const frac = inches - whole;
  const num = Math.round(frac * denom);
  if (num === 0) return { whole, num: 0, denom };
  if (num === denom) return { whole: whole + 1, num: 0, denom };
  const g = gcd(num, denom);
  return { whole, num: num / g, denom: denom / g };
}

export function inchesToDisplay(totalInches: number): string {
  const sign = totalInches < 0 ? "-" : "";
  const abs = Math.abs(totalInches);

  const feet = Math.floor(abs / 12);
  const remIn = abs - feet * 12;
  const r = roundToNearestFraction(remIn, 16);
  let inchWhole = r.whole;
  let frac = r.num ? `${r.num}/${r.denom}` : "";

  let feetNorm = feet;
  if (inchWhole >= 12) {
    feetNorm += Math.floor(inchWhole / 12);
    inchWhole = inchWhole % 12;
  }

  const inchPart = frac ? `${inchWhole} ${frac}` : `${inchWhole}`;
  return `${sign}${feetNorm}' ${inchPart}"`;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "ERR";
  const s = n.toString();
  if (s.length <= 12) return s;
  return n.toPrecision(10);
}

// Fix: use direct .kind checks to ensure TypeScript correctly narrows Value types
export function applyOp(a: Value, b: Value, op: PendingOp): Value {
  if (!op) return b;

  switch (op) {
    case "+":
    case "-": {
      if (a.kind === "DIMENSION" && b.kind === "DIMENSION") {
        return { kind: "DIMENSION", inches: op === "+" ? a.inches + b.inches : a.inches - b.inches };
      }
      if (a.kind === "NUMBER" && b.kind === "NUMBER") {
        return { kind: "NUMBER", n: op === "+" ? a.n + b.n : a.n - b.n };
      }
      return { kind: "NUMBER", n: NaN };
    }
    case "×":
    case "÷": {
      if (a.kind === "NUMBER" && b.kind === "NUMBER") {
        return { kind: "NUMBER", n: op === "×" ? a.n * b.n : a.n / b.n };
      }
      if (a.kind === "DIMENSION" && b.kind === "NUMBER") {
        return { kind: "DIMENSION", inches: op === "×" ? a.inches * b.n : a.inches / b.n };
      }
      if (a.kind === "NUMBER" && b.kind === "DIMENSION") {
        if (op === "×") return { kind: "DIMENSION", inches: a.n * b.inches };
        return { kind: "NUMBER", n: a.n / b.inches };
      }
      if (a.kind === "DIMENSION" && b.kind === "DIMENSION") {
        if (op === "÷") return { kind: "NUMBER", n: a.inches / b.inches };
        return { kind: "NUMBER", n: NaN };
      }
      
      const valA = a.kind === "NUMBER" ? a.n : a.kind === "DIMENSION" ? a.inches : a.in2;
      const valB = b.kind === "NUMBER" ? b.n : b.kind === "DIMENSION" ? b.inches : b.in2;
      return { kind: "NUMBER", n: op === "×" ? valA * valB : valA / valB };
    }
    case "×d": {
      if (a.kind === "DIMENSION" && b.kind === "DIMENSION") return { kind: "AREA", in2: a.inches * b.inches };
      if (a.kind === "DIMENSION" && b.kind === "NUMBER") return { kind: "AREA", in2: a.inches * b.n };
      if (a.kind === "NUMBER" && b.kind === "DIMENSION") return { kind: "AREA", in2: a.n * b.inches };
      return { kind: "NUMBER", n: NaN };
    }
    case "÷d": {
      if (a.kind === "DIMENSION" && b.kind === "DIMENSION") return { kind: "NUMBER", n: a.inches / b.inches };
      if (a.kind === "AREA" && b.kind === "DIMENSION") return { kind: "DIMENSION", inches: a.in2 / b.inches };
      if (a.kind === "DIMENSION" && b.kind === "NUMBER") return { kind: "NUMBER", n: a.inches / b.n };
      return { kind: "NUMBER", n: NaN };
    }
    default:
      return { kind: "NUMBER", n: NaN };
  }
}

export function displayValue(v: Value): string {
  if (v.kind === "DIMENSION") return inchesToDisplay(v.inches);
  if (v.kind === "AREA") return `${formatNumber(v.in2)} in²`;
  return formatNumber(v.n);
}
