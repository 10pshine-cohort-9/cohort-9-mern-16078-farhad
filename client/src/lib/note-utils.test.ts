import { describe, expect, it } from "vitest";
import { notePreview, stripHtml } from "./note-utils";

describe("note utilities", () => {
  it("removes markup while preserving readable text", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("truncates previews without exposing HTML", () => {
    expect(notePreview("<p>1234567890</p>", 7)).toBe("123456…");
  });
});
