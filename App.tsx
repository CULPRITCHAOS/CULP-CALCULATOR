
import React, { useMemo, useState, useCallback } from "react";
import { Mode, PendingOp, Value } from "./types";
import { FRACTIONS } from "./constants";
import {
  clampInt,
  roundToNearestFraction,
  applyOp,
  displayValue,
  formatNumber,
} from "./utils/math";

// Unit Conversion Constants (Base unit is Inches)
const UNIT_TO_INCHES = {
  FT: 12,
  YD: 36,
  MI: 63360,
  IN: 1,
  M: 39.3700787,
  CM: 0.393700787,
  MM: 0.0393700787,
};

// Deep Cherry Red Constant
const CHERRY_RED = "#A91B0D";
const CHERRY_RED_GLOW = "rgba(169, 27, 13, 0.4)";

type BlueUnit = "FT" | "YD" | "MI";
type GreenUnit = "IN" | "M" | "CM" | "MM";

// Skeuomorphic Button Component
const CalcBtn: React.FC<{
  label: React.Key | React.ReactNode;
  onPress: () => void;
  variant?: "standard" | "functional" | "tinted";
  className?: string;
  textClass?: string;
  subLabel?: string;
  isActive?: boolean;
}> = ({
  label,
  onPress,
  variant = "standard",
  className = "",
  textClass = "",
  subLabel = "",
  isActive = false,
}) => {
  let baseClasses = "";
  if (variant === "functional") {
    baseClasses = `bg-[#A91B0D] border-black text-white shadow-[0_0_12px_rgba(0,0,0,0.6)]`;
  } else if (variant === "tinted") {
    baseClasses = `bg-[#A91B0D]/20 border-[#A91B0D] text-white shadow-[0_0_10px_${CHERRY_RED_GLOW}]`;
  } else {
    baseClasses = `bg-black border-[#A91B0D] text-white shadow-[0_0_8px_${CHERRY_RED_GLOW}]`;
  }
  
  const activeClasses = isActive 
    ? (variant === "standard" || variant === "tinted" ? "brightness-150 border-white ring-1 ring-white/50" : "brightness-75 border-white ring-1 ring-white/50")
    : "";

  return (
    <button
      onClick={onPress}
      className={`
        flex flex-col items-center justify-center border-2 
        relative overflow-hidden
        active:translate-y-[2px] active:scale-[0.98] transition-all
        ${baseClasses} ${activeClasses} ${className}
      `}
    >
      <span className={`font-black select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-none ${textClass || "text-3xl"}`}>
        {label}
      </span>
      {subLabel && (
        <span className={`text-[10px] font-black mt-1 uppercase select-none leading-none tracking-tighter ${variant === 'standard' || variant === 'tinted' ? 'text-[#A91B0D]' : 'text-black/60'}`}>
          {subLabel}
        </span>
      )}
    </button>
  );
};

export default function App() {
  const [mode, setMode] = useState<Mode>("DIMENSION");

  // Entry states
  const [blueStr, setBlueStr] = useState<string>("0");
  const [blueUnit, setBlueUnit] = useState<BlueUnit>("FT");
  
  const [greenStr, setGreenStr] = useState<string>("0");
  const [greenUnit, setGreenUnit] = useState<GreenUnit>("IN");
  
  const [fracIn, setFracIn] = useState<number>(0);
  const [numStr, setNumStr] = useState<string>("0");
  const [numHasDot, setNumHasDot] = useState<boolean>(false);

  // Calc states
  const [acc, setAcc] = useState<Value>({ kind: "DIMENSION", inches: 0 });
  const [pending, setPending] = useState<PendingOp>(null);
  const [hasAcc, setHasAcc] = useState<boolean>(false);

  const entryValue: Value = useMemo(() => {
    if (mode === "NUMBER") {
      const n = parseFloat(numStr);
      return { kind: "NUMBER", n: Number.isFinite(n) ? n : NaN };
    }
    const bVal = parseFloat(blueStr) || 0;
    const gVal = parseFloat(greenStr) || 0;
    const totalInches = (bVal * UNIT_TO_INCHES[blueUnit]) + 
                        (gVal * UNIT_TO_INCHES[greenUnit]) + 
                        fracIn;
    return { kind: "DIMENSION", inches: totalInches };
  }, [mode, blueStr, blueUnit, greenStr, greenUnit, fracIn, numStr]);

  const topDisplay = useMemo(() => displayValue(entryValue), [entryValue]);
  const accDisplay = useMemo(() => (hasAcc ? displayValue(acc) : "0' 0\""));

  const resetEntry = useCallback(() => {
    if (mode === "NUMBER") {
      setNumStr("0");
      setNumHasDot(false);
    } else {
      setBlueStr("0");
      setGreenStr("0");
      setFracIn(0);
    }
  }, [mode]);

  const commitOp = (op: PendingOp) => {
    if (!hasAcc) {
      setAcc(entryValue);
      setHasAcc(true);
      setPending(op);
      resetEntry();
      return;
    }
    if (!pending) {
      setPending(op);
      resetEntry();
      return;
    }
    const next = applyOp(acc, entryValue, pending);
    setAcc(next);
    setPending(op);
    resetEntry();
  };

  const equals = () => {
    if (!hasAcc || !pending) return;
    const next = applyOp(acc, entryValue, pending);
    setAcc(next);
    setPending(null);
    setHasAcc(true);

    if (next.kind === "DIMENSION") {
      const abs = Math.abs(next.inches);
      const ft = Math.floor(abs / 12);
      const rem = abs - ft * 12;
      const r = roundToNearestFraction(rem, 16);
      setMode("DIMENSION");
      setBlueStr(String(ft));
      setBlueUnit("FT");
      setGreenStr(String(r.whole));
      setGreenUnit("IN");
      setFracIn(r.num ? r.num / r.denom : 0);
    } else {
      setMode("NUMBER");
      const resultVal = next.kind === "AREA" ? next.in2 : next.n;
      setNumStr(formatNumber(resultVal));
      setNumHasDot(String(resultVal).includes("."));
    }
  };

  const allClear = () => {
    setMode("DIMENSION");
    setBlueStr("0");
    setBlueUnit("FT");
    setGreenStr("0");
    setGreenUnit("IN");
    setFracIn(0);
    setNumStr("0");
    setNumHasDot(false);
    setAcc({ kind: "DIMENSION", inches: 0 });
    setPending(null);
    setHasAcc(false);
  };

  const appendDigit = (d: string, target: "BLUE" | "GREEN") => {
    if (mode !== "DIMENSION") setMode("DIMENSION");
    if (target === "BLUE") setBlueStr((s) => (s === "0" ? d : s + d));
    else setGreenStr((s) => (s === "0" ? d : s + d));
  };

  const backspace = (target: "BLUE" | "GREEN") => {
    if (target === "BLUE") setBlueStr((s) => (s.length <= 1 ? "0" : s.slice(0, -1)));
    else setGreenStr((s) => (s.length <= 1 ? "0" : s.slice(0, -1)));
  };

  const dotNumber = () => {
    if (mode !== "NUMBER") setMode("NUMBER");
    if (numHasDot) return;
    setNumHasDot(true);
    setNumStr((s) => s + ".");
  };

  const addFraction = (fr: number) => {
    if (mode !== "DIMENSION") setMode("DIMENSION");
    setFracIn((x) => {
      const total = x + fr;
      if (total < 1) return total;
      const carry = Math.floor(total);
      if (greenUnit !== "IN") setGreenUnit("IN");
      setGreenStr((s) => String(clampInt(s) + carry));
      return total - carry;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden select-none font-sans text-white relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay z-50" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Branding Header */}
      <div className="flex items-center justify-center h-[7%] px-4 py-2 bg-black border-b-2 border-[#A91B0D] flex-shrink-0 z-10 shadow-[0_4px_15px_rgba(169,27,13,0.5)]">
        <h1 className="text-3xl font-black italic tracking-[0.2em] text-[#A91B0D] drop-shadow-[0_0_10px_rgba(169,27,13,0.9)] uppercase">
          CULP CALCULATOR
        </h1>
      </div>

      {/* Main Display Area */}
      <div className="bg-black flex flex-col justify-end px-6 py-4 flex-shrink-0 h-[18%] min-h-[130px] border-b-2 border-[#A91B0D] relative shadow-[inset_0_-10px_40px_rgba(169,27,13,0.15)]">
        {/* Status Area (Top Left) - 60% LARGER AND ULTRA BRIGHT WHITE */}
        <div className="absolute top-4 left-6 flex flex-col space-y-1">
          <div className="px-5 py-2 border-2 border-[#A91B0D]/60 rounded bg-black/90 text-white text-[40px] leading-tight font-black font-mono shadow-[0_0_20px_rgba(169,27,13,0.4),0_0_5px_rgba(255,255,255,0.2)] w-fit drop-shadow-[0_0_2px_rgba(255,255,255,1)]">
            {accDisplay}
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div className="text-3xl font-black text-[#A91B0D] mb-2">{pending || ""}</div>
          <div className="flex flex-col items-end">
            <div className="text-6xl font-black text-white text-right font-mono tracking-tighter drop-shadow-[0_4px_20px_rgba(169,27,13,0.6)]">
              {topDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Pad 1 (Feet/Miles Block) */}
          <div className="grid grid-cols-4 flex-[4]">
            {[7, 8, 9, "YD", 4, 5, 6, "MI", 1, 2, 3, "%", 0, ".", "←", "FT"].map((item, idx) => {
              const isUnit = item === "FT" || item === "YD" || item === "MI";
              return (
                <CalcBtn
                  key={`pad1-${idx}`}
                  label={String(item)}
                  onPress={() => {
                    if (isUnit) setBlueUnit(item as BlueUnit);
                    else if (item === "←") backspace("BLUE");
                    else if (item === ".") dotNumber();
                    else if (typeof item === 'number') appendDigit(String(item), "BLUE");
                    else if (typeof item === 'string' && !isNaN(Number(item))) appendDigit(item, "BLUE");
                  }}
                  variant={isUnit ? "functional" : "standard"}
                  isActive={isUnit && blueUnit === item}
                  className="w-full h-full"
                  textClass={typeof item === 'string' && isNaN(Number(item)) ? "text-xl font-black" : "text-4xl"}
                />
              );
            })}
          </div>

          {/* Pad 2 (Inches/Metric Block) */}
          <div className="grid grid-cols-4 flex-[4]">
            {[7, 8, 9, "M", 4, 5, 6, "CM", 1, 2, 3, "MM", 0, ".", "←", "IN"].map((item, idx) => {
              const isUnit = item === "IN" || item === "M" || item === "CM" || item === "MM";
              return (
                <CalcBtn
                  key={`pad2-${idx}`}
                  label={String(item)}
                  onPress={() => {
                    if (isUnit) setGreenUnit(item as GreenUnit);
                    else if (item === "←") backspace("GREEN");
                    else if (item === ".") dotNumber();
                    else if (typeof item === 'number') appendDigit(String(item), "GREEN");
                    else if (typeof item === 'string' && !isNaN(Number(item))) appendDigit(item, "GREEN");
                  }}
                  variant={isUnit ? "functional" : "tinted"}
                  isActive={isUnit && greenUnit === item}
                  className="w-full h-full"
                  textClass={typeof item === 'string' && isNaN(Number(item)) ? "text-xl font-black" : "text-4xl"}
                />
              );
            })}
          </div>

          {/* Operations Block */}
          <div className="grid grid-cols-4 flex-[2.2]">
            <CalcBtn label="+" onPress={() => commitOp("+")} variant="functional" className="h-full" textClass="text-4xl" />
            <CalcBtn label="-" onPress={() => commitOp("-")} variant="functional" className="h-full" textClass="text-4xl" />
            <CalcBtn label="×" subLabel="NUM" onPress={() => commitOp("×")} variant="functional" className="h-full" textClass="text-3xl" />
            <CalcBtn label="÷" subLabel="NUM" onPress={() => commitOp("÷")} variant="functional" className="h-full" textClass="text-3xl" />
            
            <CalcBtn label="×d" subLabel="DIM" onPress={() => commitOp("×d")} variant="functional" className="h-full" textClass="text-2xl" />
            <CalcBtn label="÷d" subLabel="DIM" onPress={() => commitOp("÷d")} variant="functional" className="h-full" textClass="text-2xl" />
            <CalcBtn label="=" onPress={equals} variant="functional" className="h-full col-span-2" textClass="text-5xl" />
          </div>
        </div>

        {/* Fraction Rail */}
        <div className="w-[18%] flex flex-col border-l-2 border-[#A91B0D]">
           <CalcBtn label="C" onPress={resetEntry} variant="functional" className="flex-[1.2]" textClass="text-3xl" />
           <div className="flex flex-col flex-[10]">
             {FRACTIONS.map((f, idx) => (
               <CalcBtn
                 key={`frac-${idx}`}
                 label={f.label}
                 onPress={() => addFraction(f.v)}
                 variant="functional"
                 className="w-full flex-1"
                 textClass="text-xl font-black"
               />
             ))}
           </div>
        </div>
      </div>

      {/* System Footer Bar */}
      <div className="grid grid-cols-4 h-[11%] min-h-[75px] flex-shrink-0 border-t-2 border-[#A91B0D]">
          <CalcBtn 
            label="⚙️" 
            subLabel="SETTINGS" 
            onPress={() => {}} 
            variant="functional"
            className="h-full border-r border-black/10"
          />
          <CalcBtn 
            label="🛠️" 
            subLabel="TOOLS" 
            onPress={() => {}} 
            variant="functional"
            className="h-full border-r border-black/10"
          />
          <CalcBtn 
            label="?" 
            subLabel="NEW" 
            onPress={() => {}} 
            variant="functional"
            className="h-full border-r border-black/10"
          />
          <CalcBtn 
            label="AC" 
            subLabel="ALL CLEAR" 
            onPress={allClear} 
            variant="functional"
            className="h-full"
            textClass="text-2xl font-black"
          />
      </div>
    </div>
  );
}
