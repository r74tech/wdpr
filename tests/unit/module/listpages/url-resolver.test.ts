import { describe, it, expect } from "bun:test";
import {
  parseUrlParams,
  resolveUrlValue,
} from "../../../../packages/parser/src/parser/rules/block/module/listpages/url-resolver";

describe("parseUrlParams", () => {
  it("should parse empty URL", () => {
    const params = parseUrlParams("/page");
    expect(params.size).toBe(0);
  });

  it("should parse single key-value pair", () => {
    const params = parseUrlParams("/page/offset/1");
    expect(params.get("offset")).toBe("1");
  });

  it("should parse multiple key-value pairs", () => {
    const params = parseUrlParams("/page/offset/1/page2_limit/1");
    expect(params.get("offset")).toBe("1");
    expect(params.get("page2_limit")).toBe("1");
  });

  it("should handle prefixed parameters", () => {
    const params = parseUrlParams("/page/offset/1/page2_limit/5/page3_limit/0");
    expect(params.get("offset")).toBe("1");
    expect(params.get("page2_limit")).toBe("5");
    expect(params.get("page3_limit")).toBe("0");
  });
});

describe("resolveUrlValue", () => {
  it("should return undefined for undefined input", () => {
    const result = resolveUrlValue(undefined, "offset", new Map());
    expect(result).toBeUndefined();
  });

  it("should return non-@URL values as-is", () => {
    const result = resolveUrlValue("10", "offset", new Map());
    expect(result).toBe("10");
  });

  it("should resolve @URL with default value when param not in URL", () => {
    const result = resolveUrlValue("@URL|0", "offset", new Map());
    expect(result).toBe("0");
  });

  it("should resolve @URL from URL params", () => {
    const params = new Map([["offset", "5"]]);
    const result = resolveUrlValue("@URL|0", "offset", params);
    expect(result).toBe("5");
  });

  it("should handle @URL without default", () => {
    const result = resolveUrlValue("@URL", "offset", new Map());
    expect(result).toBeUndefined();
  });

  it("should use prefix for parameter name", () => {
    const params = new Map([["page2_limit", "1"]]);
    const result = resolveUrlValue("@URL|0", "limit", params, "page2");
    expect(result).toBe("1");
  });

  it("should use default when prefixed param not in URL", () => {
    const params = new Map([["offset", "1"]]);
    const result = resolveUrlValue("@URL|0", "limit", params, "page2");
    expect(result).toBe("0");
  });
});
