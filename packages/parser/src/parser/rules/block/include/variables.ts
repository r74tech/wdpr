import type { VariableMap } from "@wdprlib/ast";

export function parseVariables(tokens: string[]): VariableMap {
  const vars: VariableMap = {};
  let current = "";

  for (const token of tokens) {
    if (token === "|") {
      assignVariable(vars, current);
      current = "";
    } else {
      current += token;
    }
  }

  assignVariable(vars, current);

  return vars;
}

function assignVariable(vars: VariableMap, source: string): void {
  if (!source.trim()) {
    return;
  }

  const eqIndex = source.indexOf("=");
  if (eqIndex === -1) {
    return;
  }

  const key = source.slice(0, eqIndex).trim();
  if (!key) {
    return;
  }

  vars[key] = source.slice(eqIndex + 1).trim();
}
