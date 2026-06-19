import {
  scanAtToken,
  scanClosingBracketToken,
  scanDashToken,
  scanGreaterToken,
  scanOpeningBracketToken,
  scanPipeToken,
  scanTildeToken,
  type TokenAction,
} from "./token-actions";

export interface PunctuationScanInput {
  char: string;
  source: string;
  pos: number;
  lineStart: boolean;
  splitBlockClose: boolean;
  findInvalidAnchorNameEnd: () => number | null;
}

export type PunctuationScanResult =
  | { handled: false }
  | {
      handled: true;
      actions: TokenAction | TokenAction[];
      splitBlockCloseAt?: number;
      clearSplitBlockCloseAt?: number;
    };

export function scanPunctuationToken(input: PunctuationScanInput): PunctuationScanResult {
  const { char, source, pos, lineStart } = input;

  switch (char) {
    case "[": {
      const action = scanOpeningBracketToken(source, pos, input.findInvalidAnchorNameEnd());
      return {
        handled: true,
        actions: action,
        splitBlockCloseAt: action.splitBlockCloseAt,
      };
    }

    case "]":
      return {
        handled: true,
        actions: scanClosingBracketToken(source, pos, input.splitBlockClose),
        clearSplitBlockCloseAt: input.splitBlockClose ? pos : undefined,
      };

    case "@":
      return { handled: true, actions: scanAtToken(source, pos) };

    case ">":
      return { handled: true, actions: scanGreaterToken(source, pos, lineStart) };

    case "-":
      return { handled: true, actions: scanDashToken(source, pos, lineStart) };

    case "~": {
      const action = scanTildeToken(source, pos, lineStart);
      return action ? { handled: true, actions: action } : { handled: false };
    }

    case "|":
      return { handled: true, actions: scanPipeToken(source, pos) };

    default:
      return { handled: false };
  }
}
