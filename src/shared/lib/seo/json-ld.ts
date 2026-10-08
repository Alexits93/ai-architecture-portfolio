export type JsonLdValue = string | number | boolean | null | JsonLdValue[] | JsonLdObject;
export interface JsonLdObject {
  [key: string]: JsonLdValue;
}

/**
 * Serializes structured data for a `<script type="application/ld+json">` block.
 * JSON.stringify does not escape "<", so a value containing "</script>" would break out
 * of the script element (OWASP XSS). Escaping "<" as \u003c keeps the JSON valid and inert.
 */
export const serializeJsonLd = (data: JsonLdObject): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');
