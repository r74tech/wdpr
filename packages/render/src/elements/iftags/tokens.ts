export interface IfTagsConditionTokens {
  required: string[];
  excluded: string[];
  optional: string[];
}

export function parseIfTagsConditionTokens(condition: string): IfTagsConditionTokens {
  const tokens: IfTagsConditionTokens = {
    required: [],
    excluded: [],
    optional: [],
  };

  for (const token of condition.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("+")) {
      addTag(tokens.required, token.slice(1));
    } else if (token.startsWith("-")) {
      addTag(tokens.excluded, token.slice(1));
    } else {
      addTag(tokens.optional, token);
    }
  }

  return tokens;
}

export function hasAnyIfTagsConditionToken(tokens: IfTagsConditionTokens): boolean {
  return tokens.required.length > 0 || tokens.excluded.length > 0 || tokens.optional.length > 0;
}

function addTag(tags: string[], rawTag: string): void {
  const tag = rawTag.toLowerCase();
  if (tag) {
    tags.push(tag);
  }
}
