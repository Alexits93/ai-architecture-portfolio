import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { it, expect, assert } from "vitest";
import Causes from "@/pages/_Causes.astro";
import Goals from "@/pages/_Goals.astro";
import Hobbies from "@/pages/_Hobbies.astro";

// the sections of /about/ with the owner's hobbies, causes and goals. e2e/about.spec.ts checks the built page.
const render = async (component: typeof Hobbies) => {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(component)).window.document;
};

// Each section is named by its h2, the way the home sections are.
const namedSection = (doc: Document, id: string) => {
  const section = doc.querySelector(`section#${id}`);
  assert.exists(section);
  const heading = doc.getElementById(
    String(section.getAttribute("aria-labelledby")),
  );
  assert.exists(heading);
  expect(heading.tagName).toBe("H2");
  return section;
};

const h3s = (section: Element) =>
  [...section.querySelectorAll("h3")].map((h3) => h3.textContent);

// Music follows Video games, and freestyle football joined the Real Madrid card. Staging testers found photos on only
// some cards uneven and too personal for a professional site.
it("renders six hobby cards without photos", async () => {
  const section = namedSection(await render(Hobbies), "hobbies");
  expect(h3s(section)).toEqual([
    "Video games",
    "Music",
    "Cars",
    "Travel",
    "Real Madrid",
    "Movies",
  ]);
  expect(section.querySelectorAll("img")).toHaveLength(0);
});

it("renders the causes as headed items with a closing line", async () => {
  const section = namedSection(await render(Causes), "causes");
  expect(h3s(section)).toEqual([
    "Animals",
    "Accessibility",
    "Education",
    "Open source",
    "Nature",
  ]);
  expect(section.textContent).toContain(
    "The games I design, the articles I write and the speeches I give",
  );
});

it("renders the goals as headed items", async () => {
  const section = namedSection(await render(Goals), "goals");
  expect(h3s(section)).toEqual([
    "A life to be proud of",
    "Helping people grow",
    "Along the way",
  ]);
});
