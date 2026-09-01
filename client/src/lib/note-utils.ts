export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function notePreview(value: string, limit = 96) {
  const plain = stripHtml(value);
  return plain.length > limit ? `${plain.slice(0, limit - 1)}…` : plain;
}
