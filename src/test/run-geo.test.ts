import { describe, expect, it } from "vitest";
import { acceptPoint, formatPace, type RunPoint } from "@/lib/run/geo";

const p = (lat: number, t: number, acc = 5, seg = 0): RunPoint => ({ lat, lng: 0, t, acc, seg });

describe("run GPS filtering", () => {
  it("rejects fixes with accuracy worse than 30 m", () => {
    expect(acceptPoint(undefined, p(0, 0, 50))).toBeNull();
  });
  it("rejects jumps faster than 12 m/s", () => {
    // ~111 m in 1 s
    expect(acceptPoint(p(0, 0), p(0.001, 1000))).toBeNull();
  });
  it("accepts a normal running step", () => {
    // ~11 m in 4 s
    const d = acceptPoint(p(0, 0), p(0.0001, 4000));
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(12);
  });
  it("formats pace as min:ss", () => {
    expect(formatPace(370)).toBe("6:10");
  });
});
