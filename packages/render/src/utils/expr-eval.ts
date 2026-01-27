/**
 * Expression evaluator for Wikidot [[#expr]] and [[#ifexpr]]
 *
 * Supported:
 * - Operators: +, -, *, /, % (modulo), ^ (power)
 * - Comparison: <, >, <=, >=, =, !=
 * - Logic: and, or, not
 * - Functions: abs(), min(), max(), floor(), ceil(), round()
 * - Parentheses for grouping
 * - Negative numbers
 *
 * Expression limit: 256 characters (enforced by parser)
 */

// False values for #if (string-based check)
const FALSE_VALUES = new Set(["false", "null", "", "0"]);

/**
 * Check if a string value is truthy for #if
 */
export function isTruthy(value: string): boolean {
  return !FALSE_VALUES.has(value.toLowerCase().trim());
}

const MAX_EXPRESSION_LENGTH = 256;

/**
 * Check if a number is truthy for logical operations
 * 0 and NaN are falsy, everything else is truthy
 */
function isTruthyNum(n: number): boolean {
  return n !== 0 && !Number.isNaN(n);
}

/**
 * Expression evaluation result
 */
export type ExprResult = { success: true; value: number } | { success: false; error: string };

/**
 * Evaluate a mathematical expression
 * Returns success with value, or error with Wikidot-compatible message
 */
export function evaluateExpression(expr: string): ExprResult {
  try {
    // Enforce length limit
    if (expr.length > MAX_EXPRESSION_LENGTH) {
      return { success: false, error: "expression too long" };
    }
    if (expr.trim() === "") {
      return { success: false, error: "empty expression" };
    }
    const tokens = tokenize(expr);
    if (tokens.length <= 1) {
      // Only EOF token
      return { success: false, error: "empty expression" };
    }
    const parser = new ExprParser(tokens);
    const result = parser.parse();
    // Treat NaN and Infinity as division by zero (Wikidot-compatible)
    if (!Number.isFinite(result)) {
      return { success: false, error: "division by zero" };
    }
    return { success: true, value: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return { success: false, error: msg };
  }
}

// Token types for expression parsing
type TokenKind =
  | "NUMBER"
  | "IDENTIFIER"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "CARET"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "LT"
  | "GT"
  | "LE"
  | "GE"
  | "EQ"
  | "NE"
  | "EOF";

interface ExprToken {
  kind: TokenKind;
  value: string | number;
}

/**
 * Tokenize an expression string
 */
function tokenize(expr: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i]!;

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number (including decimals)
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
      let numStr = "";
      let hasDot = false;
      while (i < expr.length) {
        const c = expr[i]!;
        if (c === ".") {
          if (hasDot) break; // Only one decimal point allowed
          hasDot = true;
        } else if (!/\d/.test(c)) {
          break;
        }
        numStr += c;
        i++;
      }
      const num = parseFloat(numStr);
      if (!Number.isFinite(num)) {
        throw new Error("Invalid number");
      }
      tokens.push({ kind: "NUMBER", value: num });
      continue;
    }

    // Identifier (function names, keywords like and/or/not)
    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (i < expr.length) {
        const c = expr[i]!;
        if (!/[a-zA-Z0-9_]/.test(c)) break;
        id += c;
        i++;
      }
      tokens.push({ kind: "IDENTIFIER", value: id.toLowerCase() });
      continue;
    }

    // Two-character operators
    if (ch === "<" && expr[i + 1] === "=") {
      tokens.push({ kind: "LE", value: "<=" });
      i += 2;
      continue;
    }
    if (ch === ">" && expr[i + 1] === "=") {
      tokens.push({ kind: "GE", value: ">=" });
      i += 2;
      continue;
    }
    if (ch === "!" && expr[i + 1] === "=") {
      tokens.push({ kind: "NE", value: "!=" });
      i += 2;
      continue;
    }
    if (ch === "<" && expr[i + 1] === ">") {
      tokens.push({ kind: "NE", value: "<>" });
      i += 2;
      continue;
    }

    // Single-character operators
    switch (ch) {
      case "+":
        tokens.push({ kind: "PLUS", value: "+" });
        break;
      case "-":
        tokens.push({ kind: "MINUS", value: "-" });
        break;
      case "*":
        tokens.push({ kind: "STAR", value: "*" });
        break;
      case "/":
        tokens.push({ kind: "SLASH", value: "/" });
        break;
      case "%":
        tokens.push({ kind: "PERCENT", value: "%" });
        break;
      case "^":
        tokens.push({ kind: "CARET", value: "^" });
        break;
      case "(":
        tokens.push({ kind: "LPAREN", value: "(" });
        break;
      case ")":
        tokens.push({ kind: "RPAREN", value: ")" });
        break;
      case ",":
        tokens.push({ kind: "COMMA", value: "," });
        break;
      case "<":
        tokens.push({ kind: "LT", value: "<" });
        break;
      case ">":
        tokens.push({ kind: "GT", value: ">" });
        break;
      case "=":
        tokens.push({ kind: "EQ", value: "=" });
        break;
      default:
        // Unknown character is an error
        throw new Error(`Unknown character: ${ch}`);
    }
    i++;
  }

  tokens.push({ kind: "EOF", value: "" });
  return tokens;
}

/**
 * Recursive descent parser for expressions
 * Precedence (low to high):
 *   or
 *   and
 *   not (unary)
 *   comparison (<, >, <=, >=, =, !=)
 *   addition (+, -)
 *   multiplication (*, /, %)
 *   power (^)
 *   unary (-, +)
 *   primary (number, parentheses, function call)
 */
class ExprParser {
  private pos = 0;

  constructor(private tokens: ExprToken[]) {}

  parse(): number {
    const result = this.parseOr();
    if (this.current().kind !== "EOF") {
      throw new Error("Unexpected token");
    }
    return result;
  }

  private current(): ExprToken {
    return this.tokens[this.pos] ?? { kind: "EOF", value: "" };
  }

  private advance(): ExprToken {
    const token = this.current();
    this.pos++;
    return token;
  }

  private parseOr(): number {
    let left = this.parseAnd();

    while (this.current().kind === "IDENTIFIER" && this.current().value === "or") {
      this.advance();
      const right = this.parseAnd();
      // Treat 0 and NaN as falsy
      left = isTruthyNum(left) || isTruthyNum(right) ? 1 : 0;
    }

    return left;
  }

  private parseAnd(): number {
    let left = this.parseNot();

    while (this.current().kind === "IDENTIFIER" && this.current().value === "and") {
      this.advance();
      const right = this.parseNot();
      // Treat 0 and NaN as falsy
      left = isTruthyNum(left) && isTruthyNum(right) ? 1 : 0;
    }

    return left;
  }

  private parseNot(): number {
    if (this.current().kind === "IDENTIFIER" && this.current().value === "not") {
      this.advance();
      const value = this.parseNot();
      // Treat 0 and NaN as falsy
      return isTruthyNum(value) ? 0 : 1;
    }
    return this.parseComparison();
  }

  private parseComparison(): number {
    let left = this.parseAddition();

    const kind = this.current().kind;
    if (
      kind === "LT" ||
      kind === "GT" ||
      kind === "LE" ||
      kind === "GE" ||
      kind === "EQ" ||
      kind === "NE"
    ) {
      this.advance();
      const right = this.parseAddition();

      switch (kind) {
        case "LT":
          return left < right ? 1 : 0;
        case "GT":
          return left > right ? 1 : 0;
        case "LE":
          return left <= right ? 1 : 0;
        case "GE":
          return left >= right ? 1 : 0;
        case "EQ":
          return left === right ? 1 : 0;
        case "NE":
          return left !== right ? 1 : 0;
      }
    }

    return left;
  }

  private parseAddition(): number {
    let left = this.parseMultiplication();

    while (true) {
      const kind = this.current().kind;
      if (kind === "PLUS") {
        this.advance();
        left = left + this.parseMultiplication();
      } else if (kind === "MINUS") {
        this.advance();
        left = left - this.parseMultiplication();
      } else {
        break;
      }
    }

    return left;
  }

  private parseMultiplication(): number {
    let left = this.parsePower();

    while (true) {
      const kind = this.current().kind;
      if (kind === "STAR") {
        this.advance();
        left = left * this.parsePower();
      } else if (kind === "SLASH") {
        this.advance();
        left = left / this.parsePower();
      } else if (kind === "PERCENT") {
        this.advance();
        left = left % this.parsePower();
      } else {
        break;
      }
    }

    return left;
  }

  private parsePower(): number {
    const left = this.parseUnary();

    if (this.current().kind === "CARET") {
      this.advance();
      // Right-associative
      const right = this.parsePower();
      return Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    const kind = this.current().kind;

    if (kind === "MINUS") {
      this.advance();
      return -this.parseUnary();
    }
    if (kind === "PLUS") {
      this.advance();
      return this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.current();

    if (token.kind === "NUMBER") {
      this.advance();
      return token.value as number;
    }

    if (token.kind === "LPAREN") {
      this.advance();
      const value = this.parseOr();
      if (this.current().kind !== "RPAREN") {
        throw new Error("Expected )");
      }
      this.advance();
      return value;
    }

    if (token.kind === "IDENTIFIER") {
      const name = token.value as string;
      this.advance();

      // Function call
      if (this.current().kind === "LPAREN") {
        return this.parseFunctionCall(name);
      }

      // Constants (not supported in Wikidot, but could be added)
      throw new Error(`undefined constant "${name}"`);
    }

    throw new Error("Expected expression");
  }

  private parseFunctionCall(name: string): number {
    if (this.current().kind !== "LPAREN") {
      throw new Error("Expected (");
    }
    this.advance();

    const args: number[] = [];

    if (this.current().kind !== "RPAREN") {
      args.push(this.parseOr());

      while (this.current().kind === "COMMA") {
        this.advance();
        args.push(this.parseOr());
      }
    }

    if (this.current().kind !== "RPAREN") {
      throw new Error("Expected )");
    }
    this.advance();

    return this.callFunction(name, args);
  }

  private callFunction(name: string, args: number[]): number {
    switch (name) {
      case "abs":
        this.checkArgs(name, args, 1);
        return Math.abs(args[0]!);
      case "min":
        this.checkArgsMin(name, args, 1);
        return Math.min(...args);
      case "max":
        this.checkArgsMin(name, args, 1);
        return Math.max(...args);
      case "floor":
        this.checkArgs(name, args, 1);
        return Math.floor(args[0]!);
      case "ceil":
        this.checkArgs(name, args, 1);
        return Math.ceil(args[0]!);
      case "round":
        this.checkArgs(name, args, 1);
        return Math.round(args[0]!);
      case "sqrt":
        this.checkArgs(name, args, 1);
        return Math.sqrt(args[0]!);
      case "sin":
        this.checkArgs(name, args, 1);
        return Math.sin(args[0]!);
      case "cos":
        this.checkArgs(name, args, 1);
        return Math.cos(args[0]!);
      case "tan":
        this.checkArgs(name, args, 1);
        return Math.tan(args[0]!);
      case "ln":
        this.checkArgs(name, args, 1);
        return Math.log(args[0]!);
      case "log":
        this.checkArgs(name, args, 1);
        return Math.log10(args[0]!);
      case "exp":
        this.checkArgs(name, args, 1);
        return Math.exp(args[0]!);
      case "pow":
        this.checkArgs(name, args, 2);
        return Math.pow(args[0]!, args[1]!);
      default:
        throw new Error(`undefined function "${name}"`);
    }
  }

  private checkArgs(name: string, args: number[], expected: number): void {
    if (args.length !== expected) {
      throw new Error(`${name}() expects ${expected} argument(s), got ${args.length}`);
    }
  }

  private checkArgsMin(name: string, args: number[], min: number): void {
    if (args.length < min) {
      throw new Error(`${name}() expects at least ${min} argument(s), got ${args.length}`);
    }
  }
}
