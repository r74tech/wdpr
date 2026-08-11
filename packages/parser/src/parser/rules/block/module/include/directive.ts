import type { PageRef } from "@wdprlib/ast";

export interface IncludeAssignment {
  key: string;
  value: string;
}

/**
 * Parse the inner content of an `[[include ...]]` directive into a page reference
 * and variable assignments.
 */
export function parseIncludeDirective(inner: string): {
  location: PageRef;
  assignments: IncludeAssignment[];
} {
  const parts = inner.split("|");
  const firstSegment = parts[0]!.trim();

  const spaceIndex = firstSegment.search(/\s/);
  let target: string;
  const varSegments: string[] = [];

  if (spaceIndex !== -1) {
    target = firstSegment.slice(0, spaceIndex);
    const rest = firstSegment.slice(spaceIndex + 1).trim();
    if (rest) {
      varSegments.push(rest);
    }
  } else {
    target = firstSegment;
  }

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i]!.trim();
    if (segment) {
      varSegments.push(segment);
    }
  }

  const assignments = parseIncludeAssignments(varSegments);
  return { location: parseIncludePageRef(target), assignments };
}

export function substituteVariables(
  content: string,
  assignments: readonly IncludeAssignment[],
): string {
  if (assignments.length === 0) return content;
  if (!content.includes("{$")) return content;

  let substituted = content;
  for (const { key, value } of assignments) {
    substituted = substituted.replaceAll(`{$${key}}`, value);
  }
  return substituted;
}

function parseIncludePageRef(target: string): PageRef {
  if (target.startsWith(":")) {
    const rest = target.slice(1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      return { site: rest.slice(0, colonIndex), page: rest.slice(colonIndex + 1) };
    }
  }
  return { site: null, page: target };
}

function parseIncludeAssignments(varSegments: string[]): IncludeAssignment[] {
  const assignments: IncludeAssignment[] = [];

  for (const segment of varSegments) {
    const assignment = parseVariableSegment(segment);
    if (assignment) {
      assignments.push(assignment);
    }
  }

  return assignments;
}

function parseVariableSegment(segment: string): IncludeAssignment | null {
  const eqIndex = segment.indexOf("=");
  if (eqIndex === -1) return null;
  const key = segment.slice(0, eqIndex).trim();
  if (!key) return null;
  const value = segment.slice(eqIndex + 1).trim();
  if (value === "") return null;
  return { key, value };
}
