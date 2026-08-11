import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";

describe("ListPages parser", () => {
  it("preserves underscore names and accepts snake_case attributes", () => {
    const { ast } = parse(
      [
        '[[module ListPages link_to="target" created_by="user" created_at="2026" updated_at="2025" per_page="7" prepend_line="before" append_line="after" rss_description="description" rss_home="/home" rss_limit="3" rss_only="yes" url_attr_prefix="page2" _status="open"]]',
        "%%title%%",
        "[[/module]]",
      ].join("\n"),
    );
    const module = ast.elements.find((element) => element.element === "module");

    expect(module?.data).toMatchObject({
      module: "list-pages",
      "link-to": "target",
      "created-by": "user",
      "created-at": "2026",
      "updated-at": "2025",
      "per-page": 7,
      "prepend-line": "before",
      "append-line": "after",
      "rss-description": "description",
      "rss-home": "/home",
      "rss-limit": 3,
      "rss-only": true,
      "url-attr-prefix": "page2",
      attributes: {
        link_to: "target",
        created_by: "user",
        created_at: "2026",
        updated_at: "2025",
        per_page: "7",
        prepend_line: "before",
        append_line: "after",
        rss_description: "description",
        rss_home: "/home",
        rss_limit: "3",
        rss_only: "yes",
        url_attr_prefix: "page2",
        _status: "open",
      },
    });
  });
});
