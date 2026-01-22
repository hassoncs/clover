import type { Token, TokenType } from './types';

const OPERATORS = [
  '&&',
  '||',
  '<=',
  '>=',
  '==',
  '!=',
  '+',
  '-',
  '*',
  '/',
  '%',
  '<',
  '>',
  '!',
] as const;

const KEYWORDS: Record<string, boolean> = {
  true: true,
  false: true,
  vec2: true,
};

export class Tokenizer {
  private source: string;
  private position = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];
  private inTemplate = false;
  private templateDepth = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private scanToken(): void {
    this.skipWhitespace();
    if (this.isAtEnd()) return;

    const start = this.position;
    const char = this.peek();

    if (this.inTemplate) {
      this.scanTemplateContent();
      return;
    }

    if (char === '`') {
      this.advance();
      this.inTemplate = true;
      this.templateDepth++;
      this.addToken('TEMPLATE_START', '`', start);
      return;
    }

    if (char === '"' || char === "'") {
      this.scanString(char);
      return;
    }

    if (this.isDigit(char)) {
      this.scanNumber();
      return;
    }

    if (this.isIdentifierStart(char)) {
      this.scanIdentifier();
      return;
    }

    if (this.matchOperator()) {
      return;
    }

    switch (char) {
      case '(':
        this.advance();
        this.addToken('LPAREN', '(', start);
        break;
      case ')':
        this.advance();
        this.addToken('RPAREN', ')', start);
        break;
      case ',':
        this.advance();
        this.addToken('COMMA', ',', start);
        break;
      case '.':
        this.advance();
        this.addToken('DOT', '.', start);
        break;
      case '?':
        this.advance();
        this.addToken('QUESTION', '?', start);
        break;
      case ':':
        this.advance();
        this.addToken('COLON', ':', start);
        break;
      default:
        throw this.error(`Unexpected character: '${char}'`);
    }
  }

  private scanTemplateContent(): void {
    const start = this.position;
    let text = '';

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === '`') {
        if (text.length > 0) {
          this.addToken('TEMPLATE_TEXT', text, start);
        }
        this.advance();
        this.inTemplate = false;
        this.templateDepth--;
        this.addToken('TEMPLATE_END', '`', this.position - 1);
        return;
      }

      if (char === '$' && this.peekNext() === '{') {
        if (text.length > 0) {
          this.addToken('TEMPLATE_TEXT', text, start);
        }
        this.advance();
        this.advance();
        this.addToken('TEMPLATE_EXPR_START', '${', this.position - 2);
        this.scanTemplateExpression();
        text = '';
        continue;
      }

      if (char === '\\' && !this.isAtEnd()) {
        this.advance();
        const escaped = this.advance();
        text += this.getEscapedChar(escaped);
      } else {
        if (char === '\n') {
          this.line++;
          this.column = 0;
        }
        text += this.advance();
      }
    }

    throw this.error('Unterminated template string');
  }

  private scanTemplateExpression(): void {
    let braceCount = 1;
    const wasInTemplate = this.inTemplate;
    this.inTemplate = false;

    while (!this.isAtEnd() && braceCount > 0) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      const char = this.peek();

      if (char === '{') {
        braceCount++;
        this.scanToken();
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          this.advance();
          this.inTemplate = wasInTemplate;
          return;
        }
        this.scanToken();
      } else {
        this.scanToken();
      }
    }

    this.inTemplate = wasInTemplate;
    if (braceCount > 0) {
      throw this.error('Unterminated expression in template string');
    }
  }

  private scanString(quote: string): void {
    const start = this.position;
    this.advance();
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          value += this.getEscapedChar(this.advance());
        }
      } else {
        if (this.peek() === '\n') {
          throw this.error('Unterminated string (newline in string)');
        }
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw this.error('Unterminated string');
    }

    this.advance();
    this.addToken('STRING', value, start);
  }

  private getEscapedChar(char: string): string {
    switch (char) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case '\\':
        return '\\';
      case '"':
        return '"';
      case "'":
        return "'";
      case '`':
        return '`';
      case '$':
        return '$';
      default:
        return char;
    }
  }

  private scanNumber(): void {
    const start = this.position;

    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      if (!this.isDigit(this.peek())) {
        throw this.error('Invalid number: expected digit after exponent');
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.slice(start, this.position);
    this.addToken('NUMBER', value, start);
  }

  private scanIdentifier(): void {
    const start = this.position;

    while (this.isIdentifierPart(this.peek())) {
      this.advance();
    }

    const value = this.source.slice(start, this.position);
    this.addToken('IDENTIFIER', value, start);
  }

  private matchOperator(): boolean {
    for (const op of OPERATORS) {
      if (this.source.slice(this.position, this.position + op.length) === op) {
        const start = this.position;
        for (let i = 0; i < op.length; i++) {
          this.advance();
        }
        this.addToken('OPERATOR', op, start);
        return true;
      }
    }
    return false;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      switch (char) {
        case ' ':
        case '\t':
        case '\r':
          this.advance();
          break;
        case '\n':
          this.line++;
          this.column = 0;
          this.advance();
          break;
        default:
          return;
      }
    }
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private advance(): string {
    const char = this.source[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private addToken(type: TokenType, value: string, start?: number): void {
    this.tokens.push({
      type,
      value,
      position: start ?? this.position,
      line: this.line,
      column: this.column - value.length,
    });
  }

  private error(message: string): Error {
    return new Error(
      `Tokenizer error at line ${this.line}, column ${this.column}: ${message}`
    );
  }
}

export function tokenize(source: string): Token[] {
  return new Tokenizer(source).tokenize();
}
