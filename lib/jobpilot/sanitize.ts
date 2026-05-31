const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const blockedElementPattern = /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const htmlTagPattern = /<[^>]*>/g;
const looseAngleBrackets = /[<>]/g;

type SanitizeOptions = {
  maxLength?: number;
  multiline?: boolean;
};

export function sanitizeText(value: string, options: SanitizeOptions = {}) {
  const { maxLength = 500, multiline = false } = options;
  const withoutTags = value.replace(blockedElementPattern, " ").replace(htmlTagPattern, " ").replace(looseAngleBrackets, "");
  const withoutControls = withoutTags.replace(controlCharacters, "");
  const normalized = multiline
    ? withoutControls
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : withoutControls.replace(/\s+/g, " ").trim();

  return normalized.slice(0, maxLength);
}

export function sanitizeTextList(items: unknown, options: SanitizeOptions = {}) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeText(item, options))
    .filter(Boolean);
}
