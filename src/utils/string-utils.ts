const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

export function truncateString(text: string, maxLength: number): string {
  validateMaxLength(maxLength);

  if (maxLength === 0 || text.length === 0) {
    return "";
  }

  const graphemes = splitGraphemes(text);
  if (graphemes.length <= maxLength) {
    return text;
  }

  return graphemes.slice(0, maxLength).join("");
}

function validateMaxLength(maxLength: number) {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    throw new RangeError("maxLength must be a non-negative integer");
  }
}

function splitGraphemes(text: string) {
  return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment);
}
