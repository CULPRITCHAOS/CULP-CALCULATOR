
export type Mode = "DIMENSION" | "NUMBER";

export type PendingOp = "+" | "-" | "×" | "÷" | "×d" | "÷d" | null;

export type ValueKind = "NUMBER" | "DIMENSION" | "AREA";

export type Value =
  | { kind: "NUMBER"; n: number }
  | { kind: "DIMENSION"; inches: number }
  | { kind: "AREA"; in2: number };

export interface Fraction {
  label: string;
  v: number;
}
