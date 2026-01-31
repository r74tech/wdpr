import { createPoint, createPosition } from "@wdprlib/ast";
import { createToken, type Token, type TokenType } from "./tokens";

/**
 * Lexer options
 */
export interface LexerOptions {
  /** Track position information */
  trackPositions?: boolean;
}

/**
 * Lexer state
 */
interface LexerState {
  source: string;
  pos: number;
  line: number;
  column: number;
  lineStart: boolean;
  tokens: Token[];
}

/**
 * Wikidot markup lexer
 */
export class Lexer {
  private state: LexerState;
  private options: Required<LexerOptions>;
  // Positions where ]] should be split into ] + ] (for invalid anchor names)
  private splitBlockClosePositions: Set<number> = new Set();

  constructor(source: string, options: LexerOptions = {}) {
    this.options = {
      trackPositions: options.trackPositions ?? true,
    };
    this.state = {
      source,
      pos: 0,
      line: 1,
      column: 1,
      lineStart: true,
      tokens: [],
    };
  }

  /**
   * Tokenize the entire source
   */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken("EOF", "");
    return this.state.tokens;
  }

  /**
   * Check if at end of source
   */
  private isAtEnd(): boolean {
    return this.state.pos >= this.state.source.length;
  }

  /**
   * Get current character
   */
  private current(): string {
    return this.state.source[this.state.pos] ?? "";
  }

  /**
   * Check if [[# is followed by an invalid anchor name that closes with ]].
   * Valid: [[# valid-name]] where name matches [-_A-Za-z0-9.%]+
   * Invalid: [[# name with spaces]] or [[# name$special]]
   * When invalid, returns the position of the closing ]] so the lexer can
   * emit tokens that allow the inner [# text] to be parsed as a described link.
   */
  private findInvalidAnchorNameEnd(): number | null {
    const src = this.state.source;
    const pos = this.state.pos;

    // Must start with [[#
    if (src[pos] !== "[" || src[pos + 1] !== "[" || src[pos + 2] !== "#") {
      return null;
    }

    // Must have space after #
    if (src[pos + 3] !== " ") {
      return null;
    }

    // Skip spaces after #
    let i = pos + 4;
    while (i < src.length && src[i] === " ") {
      i++;
    }

    // Scan for invalid characters
    let foundInvalid = false;
    while (i < src.length) {
      const ch = src[i]!;
      if (ch === "\n") return null;
      if (ch === "]" && src[i + 1] === "]") {
        // Reached ]] - if we found invalid chars, this is an invalid anchor name
        return foundInvalid ? i : null;
      }
      const code = ch.charCodeAt(0);
      const isValid =
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) || // a-z
        code === 45 || // -
        code === 95 || // _
        code === 46 || // .
        code === 37; // %
      if (!isValid) {
        foundInvalid = true;
      }
      i++;
    }

    return null;
  }

  /**
   * Check if source matches pattern at current position
   */
  private match(pattern: string): boolean {
    for (let i = 0; i < pattern.length; i++) {
      if (this.state.source[this.state.pos + i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Advance position by n characters
   */
  private advance(n = 1): string {
    let result = "";
    for (let i = 0; i < n && !this.isAtEnd(); i++) {
      const char = this.current();
      result += char;
      this.state.pos++;

      if (char === "\n") {
        this.state.line++;
        this.state.column = 1;
        this.state.lineStart = true;
      } else {
        this.state.column++;
        if (char !== " " && char !== "\t") {
          this.state.lineStart = false;
        }
      }
    }
    return result;
  }

  /**
   * Add token
   */
  private addToken(type: TokenType, value: string): void {
    const startPos = createPoint(
      this.state.line,
      this.state.column - value.length,
      this.state.pos - value.length,
    );
    const endPos = createPoint(this.state.line, this.state.column, this.state.pos);
    const position = this.options.trackPositions
      ? createPosition(startPos, endPos)
      : createPosition(createPoint(0, 0, 0), createPoint(0, 0, 0));

    const lineStart =
      this.state.tokens.length === 0 ||
      this.state.tokens[this.state.tokens.length - 1]?.type === "NEWLINE";

    this.state.tokens.push(createToken(type, value, position, lineStart));
  }

  /**
   * Scan a single token
   */
  private scanToken(): void {
    const char = this.current();
    const isLineStart = this.state.lineStart;

    // Newline
    if (char === "\n") {
      this.advance();
      this.addToken("NEWLINE", "\n");
      return;
    }

    // Whitespace (non-newline)
    if (char === " " || char === "\t") {
      let ws = "";
      while (!this.isAtEnd() && (this.current() === " " || this.current() === "\t")) {
        ws += this.advance();
      }
      this.addToken("WHITESPACE", ws);
      return;
    }

    // Comment open [!-- (must check before [[[)
    if (this.match("[!--")) {
      this.advance(4);
      this.addToken("COMMENT_OPEN", "[!--");
      return;
    }

    // Link open [[[ (must check before [[)
    if (this.match("[[[")) {
      this.advance(3);
      this.addToken("LINK_OPEN", "[[[");
      return;
    }

    // Block end open [[/
    if (this.match("[[/")) {
      this.advance(3);
      this.addToken("BLOCK_END_OPEN", "[[/");
      return;
    }

    // Block open [[
    if (this.match("[[")) {
      // Check for invalid anchor name pattern: [[# name-with-spaces]]
      // Wikidot's Anchor regex requires [-_A-Za-z0-9.%] only after [[# .
      // If [[# is followed by invalid anchor name, decompose into
      // TEXT "[" so the inner [# text] is parsed as a described anchor link.
      // The closing ]] will also be split: ] (BRACKET_CLOSE) + ] (TEXT).
      const invalidEnd = this.findInvalidAnchorNameEnd();
      if (invalidEnd !== null) {
        this.splitBlockClosePositions.add(invalidEnd);
        this.advance(1);
        this.addToken("TEXT", "[");
        return;
      }
      this.advance(2);
      this.addToken("BLOCK_OPEN", "[[");
      return;
    }

    // Link close ]]] (must check before ]])
    if (this.match("]]]")) {
      this.advance(3);
      this.addToken("LINK_CLOSE", "]]]");
      return;
    }

    // Block close ]]
    if (this.match("]]")) {
      // For invalid anchor names, split ]] into ] (BRACKET_CLOSE) + ] (TEXT)
      if (this.splitBlockClosePositions.has(this.state.pos)) {
        this.splitBlockClosePositions.delete(this.state.pos);
        this.advance(1);
        this.addToken("BRACKET_CLOSE", "]");
        this.advance(1);
        this.addToken("TEXT", "]");
        return;
      }
      this.advance(2);
      this.addToken("BLOCK_CLOSE", "]]");
      return;
    }

    // Raw/escape @@
    if (this.match("@@")) {
      this.advance(2);
      this.addToken("RAW_OPEN", "@@");
      return;
    }

    // Raw block @<
    if (this.match("@<")) {
      this.advance(2);
      this.addToken("RAW_BLOCK_OPEN", "@<");
      return;
    }

    // Raw block close >@
    if (this.match(">@")) {
      this.advance(2);
      this.addToken("RAW_BLOCK_CLOSE", ">@");
      return;
    }

    // Monospace open {{
    if (this.match("{{")) {
      this.advance(2);
      this.addToken("MONO_MARKER", "{{");
      return;
    }

    // Monospace close }}
    if (this.match("}}")) {
      this.advance(2);
      this.addToken("MONO_CLOSE", "}}");
      return;
    }

    // Bold **
    if (this.match("**")) {
      this.advance(2);
      this.addToken("BOLD_MARKER", "**");
      return;
    }

    // Horizontal rule ---- or more (4+ hyphens, check before --)
    if (isLineStart && this.match("----")) {
      let dashes = "";
      while (this.current() === "-") {
        dashes += this.advance();
      }
      this.addToken("HR_MARKER", dashes);
      return;
    }

    // Comment close --] (must check before --)
    if (this.match("--]")) {
      this.advance(3);
      this.addToken("COMMENT_CLOSE", "--]");
      return;
    }

    // Strikethrough -- (Wikidot only uses --)
    if (this.match("--")) {
      this.advance(2);
      this.addToken("STRIKE_MARKER", "--");
      return;
    }

    // Left double angle << (guillemet)
    if (this.match("<<")) {
      this.advance(2);
      this.addToken("LEFT_DOUBLE_ANGLE", "<<");
      return;
    }

    // Clear float ~~~~ or more (at line start only, Wikidot requires 4+)
    if (isLineStart && this.match("~~~~")) {
      let tildes = "";
      while (this.current() === "~") {
        tildes += this.advance();
      }
      // Check for directional clear float
      if (this.current() === "<") {
        this.advance();
        this.addToken("CLEAR_FLOAT_LEFT", `${tildes}<`);
        return;
      }
      if (this.current() === ">") {
        this.advance();
        this.addToken("CLEAR_FLOAT_RIGHT", `${tildes}>`);
        return;
      }
      this.addToken("CLEAR_FLOAT", `${tildes}`);
      return;
    }

    // Single hyphen (not part of --)
    if (char === "-") {
      this.advance();
      this.addToken("TEXT", "-");
      return;
    }

    // Underline __ (check before single _)
    if (this.match("__")) {
      this.advance(2);
      this.addToken("UNDERLINE_MARKER", "__");
      return;
    }

    // Single underscore _ (for line break)
    if (char === "_") {
      this.advance();
      this.addToken("UNDERSCORE", "_");
      return;
    }

    // Superscript ^^
    if (this.match("^^")) {
      this.advance(2);
      this.addToken("SUPER_MARKER", "^^");
      return;
    }

    // Subscript ,,
    if (this.match(",,")) {
      this.advance(2);
      this.addToken("SUB_MARKER", ",,");
      return;
    }

    // Italic //
    if (this.match("//")) {
      this.advance(2);
      this.addToken("ITALIC_MARKER", "//");
      return;
    }

    // Table markers
    // ||~ (header), ||< (left), ||= (center), ||> (right), || (normal)
    if (this.match("||~")) {
      this.advance(3);
      this.addToken("TABLE_HEADER", "||~");
      return;
    }
    if (this.match("||<")) {
      this.advance(3);
      this.addToken("TABLE_LEFT", "||<");
      return;
    }
    if (this.match("||=")) {
      this.advance(3);
      this.addToken("TABLE_CENTER", "||=");
      return;
    }
    if (this.match("||>")) {
      this.advance(3);
      this.addToken("TABLE_RIGHT", "||>");
      return;
    }
    if (this.match("||")) {
      this.advance(2);
      this.addToken("TABLE_MARKER", "||");
      return;
    }

    // Heading + (at line start)
    if (isLineStart && char === "+") {
      let plusCount = 0;
      while (this.current() === "+") {
        plusCount++;
        this.advance();
      }
      this.addToken("HEADING_MARKER", "+".repeat(plusCount));
      return;
    }

    // List bullet * (at line start)
    if (isLineStart && char === "*") {
      this.advance();
      this.addToken("LIST_BULLET", "*");
      return;
    }

    // Color marker ## (check before LIST_NUMBER)
    if (this.match("##")) {
      this.advance(2);
      this.addToken("COLOR_MARKER", "##");
      return;
    }

    // List number # (at line start)
    if (isLineStart && char === "#") {
      this.advance();
      this.addToken("LIST_NUMBER", "#");
      return;
    }

    // Blockquote > or >>> (at line start only for blockquote)
    if (char === ">") {
      if (isLineStart) {
        // At line start: consume all consecutive > as a single blockquote marker
        let depth = "";
        while (this.current() === ">") {
          depth += this.advance();
        }
        this.addToken("BLOCKQUOTE_MARKER", depth);
        return;
      }
      // Not at line start
      if (this.match(">>")) {
        // >> not at line start - guillemet
        this.advance(2);
        this.addToken("RIGHT_DOUBLE_ANGLE", ">>");
        return;
      }
      // Single > not at line start - just text
      this.advance();
      this.addToken("TEXT", ">");
      return;
    }

    // Bracket anchor [#
    if (this.match("[#")) {
      this.advance(2);
      this.addToken("BRACKET_ANCHOR", "[#");
      return;
    }

    // Bracket star [* (for new tab links)
    if (this.match("[*")) {
      this.advance(2);
      this.addToken("BRACKET_STAR", "[*");
      return;
    }

    // Single characters
    if (char === "[") {
      this.advance();
      this.addToken("BRACKET_OPEN", "[");
      return;
    }

    if (char === "]") {
      this.advance();
      this.addToken("BRACKET_CLOSE", "]");
      return;
    }

    if (char === "|") {
      this.advance();
      this.addToken("PIPE", "|");
      return;
    }

    if (char === "=") {
      this.advance();
      this.addToken("EQUALS", "=");
      return;
    }

    // Quoted string
    if (char === '"') {
      let quoted = this.advance(); // opening "
      while (!this.isAtEnd() && this.current() !== '"' && this.current() !== "\n") {
        quoted += this.advance();
      }
      if (this.current() === '"') {
        quoted += this.advance(); // closing "
      }
      this.addToken("QUOTED_STRING", quoted);
      return;
    }

    if (char === ":") {
      this.advance();
      this.addToken("COLON", ":");
      return;
    }

    if (char === "/") {
      this.advance();
      this.addToken("SLASH", "/");
      return;
    }

    if (char === "*") {
      this.advance();
      this.addToken("STAR", "*");
      return;
    }

    if (char === "#") {
      this.advance();
      this.addToken("HASH", "#");
      return;
    }

    if (char === "@") {
      this.advance();
      this.addToken("AT", "@");
      return;
    }

    if (char === "&") {
      this.advance();
      this.addToken("AMPERSAND", "&");
      return;
    }

    if (char === "\\") {
      this.advance();
      this.addToken("BACKSLASH", "\\");
      return;
    }

    // Backslash line break marker (U+E000, inserted by preproc)
    if (char.charCodeAt(0) === 0xe000) {
      this.advance();
      this.addToken("BACKSLASH_BREAK", char);
      return;
    }

    // Identifier: alphanumeric sequence
    if (this.isAlphanumeric(char)) {
      let ident = "";
      while (!this.isAtEnd() && this.isAlphanumeric(this.current())) {
        ident += this.advance();
      }
      this.addToken("IDENTIFIER", ident);
      return;
    }

    // Default: single character as text
    const text = this.advance();
    this.addToken("TEXT", text);
  }

  /**
   * Check if character is alphanumeric (for identifier tokens)
   */
  private isAlphanumeric(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
      (code >= 48 && code <= 57) || // 0-9
      (code >= 65 && code <= 90) || // A-Z
      (code >= 97 && code <= 122) // a-z
    );
  }
}

/**
 * Tokenize source string
 */
export function tokenize(source: string, options?: LexerOptions): Token[] {
  return new Lexer(source, options).tokenize();
}
