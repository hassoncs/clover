import type { ASTNode } from './types';
export declare class Parser {
    private tokens;
    private current;
    private source;
    constructor(source: string);
    parse(): ASTNode;
    private parseExpression;
    private parseTernary;
    private parseBinaryOp;
    private parseUnary;
    private parsePostfix;
    private parseArguments;
    private parsePrimary;
    private parseVectorLiteral;
    private parseTemplateString;
    private match;
    private check;
    private advance;
    private expect;
    private peek;
    private previous;
    private isAtEnd;
    private error;
}
export declare function parse(source: string): ASTNode;
//# sourceMappingURL=parser.d.ts.map