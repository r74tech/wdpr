import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initEmail } from "../src/email";

describe("email", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  test("decodes obfuscated email", () => {
    // "user@example.com" reversed with | for @ = "moc.elpmaxe|resu"
    // Actually: reverse of "user@example.com" = "moc.elpmaxe@resu"
    // with | replacing @ in obfuscated = "moc.elpmaxe|resu"
    // But the obfuscation is: original reversed + | for @
    // "user@example.com" → reverse → "moc.elpmaxe@resu" → replace @ with | → "moc.elpmaxe|resu"
    root.innerHTML = `<span class="wiki-email">moc.elpmaxe|resu</span>`;
    initEmail(root);

    const link = root.querySelector("a") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe("mailto:user@example.com");
    expect(link.textContent).toBe("user@example.com");
  });

  test("handles empty email element", () => {
    root.innerHTML = `<span class="wiki-email"></span>`;
    initEmail(root);

    // Should not create a link
    const link = root.querySelector("a");
    expect(link).toBeNull();
  });
});
