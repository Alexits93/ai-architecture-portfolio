import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Runs the file as a classic script in a fresh window, as the inline <head> copy runs
// (https://github.com/jsdom/jsdom#running-vm-scripts).
const path = fileURLToPath(new URL("./theme.js", import.meta.url));
const script = new Script(readFileSync(path, "utf-8"), { filename: path });
const run = (setup: (window: JSDOM["window"]) => void = () => {}) => {
  const dom = new JSDOM("", {
    url: "https://www.pa-tech.dev/",
    runScripts: "outside-only",
  });
  setup(dom.window);
  script.runInContext(dom.getInternalVMContext());
  return dom.window;
};

describe("theme script", () => {
  it.each(["dark", "light"])('applies a stored "%s"', (stored) => {
    const window = run((w) => w.localStorage.setItem("theme", stored));
    expect(window.document.documentElement.dataset.theme).toBe(stored);
  });

  it.each([undefined, "bogus"])("sets nothing for stored %s", (stored) => {
    const window = run(
      (w) => stored && w.localStorage.setItem("theme", stored),
    );
    expect(window.document.documentElement.hasAttribute("data-theme")).toBe(
      false,
    );
  });

  it("keeps the OS theme when storage throws", () => {
    const window = run((w) => {
      w.Storage.prototype.getItem = () => {
        throw new w.DOMException("denied", "SecurityError");
      };
    });
    expect(window.document.documentElement.hasAttribute("data-theme")).toBe(
      false,
    );
  });

  it("declares no globals", () => {
    const window = run((w) => w.localStorage.setItem("theme", "dark"));
    expect(["theme", "storedTheme"].filter((name) => name in window)).toEqual(
      [],
    );
  });
});
