import type { Token } from './types';
export declare class Tokenizer {
    private source;
    private position;
    private line;
    private column;
    private tokens;
    private inTemplate;
    private templateDepth;
    constructor(source: string);
    tokenize(): Token[];
    private scanToken;
    private scanTemplateContent;
    private scanTemplateExpression;
    private scanString;
    private getEscapedChar;
    private scanNumber;
    private scanIdentifier;
    private matchOperator;
    private skipWhitespace;
    private isDigit;
    private isIdentifierStart;
    private isIdentifierPart;
    private peek;
    private peekNext;
    private advance;
    private isAtEnd;
    private addToken;
    private error;
}
export declare function tokenize(source: string): Token[];
//# sourceMappingURL=tokenizer.d.ts.map