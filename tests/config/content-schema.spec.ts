import { describe, it, expect } from "vitest";
import { experienceSchema } from "@/content.config";

// The one rule Zod does not give for free: each emphasis term must appear in a highlight, or the CV renders no
// strong text for it.
const entry = {
  id: "acme",
  start: 2020,
  end: 2023,
  company: "Acme",
  role: "Frontend Developer",
  highlights: ["Built the Angular app."],
  emphasis: ["Angular"],
  skills: ["Angular"],
};

describe("experience collection schema", () => {
  it("accepts an emphasis term that a highlight contains", () => {
    expect(experienceSchema.safeParse(entry).success).toBe(true);
  });

  it("rejects an emphasis term that no highlight contains", () => {
    expect(
      experienceSchema.safeParse({ ...entry, emphasis: ["Vue.js"] }).success,
    ).toBe(false);
  });
});
