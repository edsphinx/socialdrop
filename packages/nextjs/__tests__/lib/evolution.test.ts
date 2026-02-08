import { describe, expect, it } from "vitest";
import { EVOLUTION_THRESHOLDS, MAX_LEVEL, checkEvolution } from "~~/lib/evolution";

describe("EVOLUTION_THRESHOLDS", () => {
  it("defines threshold for level 2 at 10 likes", () => {
    expect(EVOLUTION_THRESHOLDS[2]).toBe(10);
  });

  it("defines threshold for level 3 at 25 likes", () => {
    expect(EVOLUTION_THRESHOLDS[3]).toBe(25);
  });

  it("defines threshold for level 4 at 50 likes", () => {
    expect(EVOLUTION_THRESHOLDS[4]).toBe(50);
  });

  it("has no threshold beyond level 4", () => {
    expect(EVOLUTION_THRESHOLDS[5]).toBeUndefined();
  });
});

describe("checkEvolution", () => {
  // --- Single-level jumps ---

  it("returns 2 when at level 1 with exactly 10 likes", () => {
    expect(checkEvolution(1, 10)).toBe(2);
  });

  it("returns null when at level 1 with 9 likes", () => {
    expect(checkEvolution(1, 9)).toBeNull();
  });

  it("returns null when at level 1 with 0 likes", () => {
    expect(checkEvolution(1, 0)).toBeNull();
  });

  it("returns 3 when at level 2 with exactly 25 likes", () => {
    expect(checkEvolution(2, 25)).toBe(3);
  });

  it("returns null when at level 2 with 24 likes", () => {
    expect(checkEvolution(2, 24)).toBeNull();
  });

  it("returns 4 when at level 3 with exactly 50 likes", () => {
    expect(checkEvolution(3, 50)).toBe(4);
  });

  it("returns null when at level 3 with 49 likes", () => {
    expect(checkEvolution(3, 49)).toBeNull();
  });

  // --- Multi-level jumps (THE BUG WE FIXED) ---

  it("jumps from level 1 to 3 when score is 25 (skipping level 2)", () => {
    expect(checkEvolution(1, 25)).toBe(3);
  });

  it("jumps from level 1 to 4 when score is 50 (skipping levels 2 and 3)", () => {
    expect(checkEvolution(1, 50)).toBe(4);
  });

  it("jumps from level 1 to 4 when score is 999 (far exceeds all thresholds)", () => {
    expect(checkEvolution(1, 999)).toBe(4);
  });

  it("jumps from level 2 to 4 when score is 50", () => {
    expect(checkEvolution(2, 50)).toBe(4);
  });

  it("returns only 2 when at level 1 with 15 likes (between thresholds)", () => {
    // 15 >= 10 (level 2) but 15 < 25 (level 3)
    expect(checkEvolution(1, 15)).toBe(2);
  });

  // --- Max level ---

  it("returns null when at max level regardless of score", () => {
    expect(checkEvolution(MAX_LEVEL, 100)).toBeNull();
    expect(checkEvolution(MAX_LEVEL, 999)).toBeNull();
  });

  // --- Edge cases ---

  it("returns null for level 0 (should never happen)", () => {
    expect(checkEvolution(0, 100)).toBeNull();
  });

  it("handles negative scores gracefully", () => {
    expect(checkEvolution(1, -5)).toBeNull();
  });
});
