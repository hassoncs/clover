import { tokenize } from './tokenizer';
const PRECEDENCE = {
    '||': 1,
    '&&': 2,
    '==': 3,
    '!=': 3,
    '<': 4,
    '<=': 4,
    '>': 4,
    '>=': 4,
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '%': 6,
};
export class Parser {
    tokens;
    current = 0;
    source;
    constructor(source) {
        this.source = source;
        this.tokens = tokenize(source);
    }
    parse() {
        const node = this.parseExpression();
        if (!this.isAtEnd()) {
            throw this.error(`Unexpected token: ${this.peek().value}`);
        }
        return node;
    }
    parseExpression() {
        return this.parseTernary();
    }
    parseTernary() {
        const start = this.peek().position;
        let condition = this.parseBinaryOp(0);
        if (this.match('QUESTION')) {
            const consequent = this.parseExpression();
            this.expect('COLON', "Expected ':' in ternary expression");
            const alternate = this.parseExpression();
            condition = {
                type: 'Ternary',
                condition,
                consequent,
                alternate,
                start,
                end: this.previous().position,
            };
        }
        return condition;
    }
    parseBinaryOp(minPrecedence) {
        let left = this.parseUnary();
        while (true) {
            const token = this.peek();
            if (token.type !== 'OPERATOR')
                break;
            const precedence = PRECEDENCE[token.value];
            if (precedence === undefined || precedence < minPrecedence)
                break;
            this.advance();
            const operator = token.value;
            const right = this.parseBinaryOp(precedence + 1);
            left = {
                type: 'BinaryOp',
                operator,
                left,
                right,
                start: left.start,
                end: right.end,
            };
        }
        return left;
    }
    parseUnary() {
        const token = this.peek();
        if (token.type === 'OPERATOR' && (token.value === '-' || token.value === '!')) {
            const start = token.position;
            this.advance();
            const operand = this.parseUnary();
            return {
                type: 'UnaryOp',
                operator: token.value,
                operand,
                start,
                end: operand.end,
            };
        }
        return this.parsePostfix();
    }
    parsePostfix() {
        let node = this.parsePrimary();
        while (true) {
            if (this.match('DOT')) {
                const property = this.expect('IDENTIFIER', 'Expected property name after "."');
                node = {
                    type: 'MemberAccess',
                    object: node,
                    property: property.value,
                    start: node.start,
                    end: property.position + property.value.length,
                };
            }
            else if (this.match('LPAREN') && node.type === 'Identifier') {
                const args = this.parseArguments();
                const endToken = this.previous();
                node = {
                    type: 'FunctionCall',
                    name: node.name,
                    args,
                    start: node.start,
                    end: endToken.position,
                };
            }
            else {
                break;
            }
        }
        return node;
    }
    parseArguments() {
        const args = [];
        if (!this.check('RPAREN')) {
            do {
                args.push(this.parseExpression());
            } while (this.match('COMMA'));
        }
        this.expect('RPAREN', "Expected ')' after function arguments");
        return args;
    }
    parsePrimary() {
        const token = this.peek();
        if (token.type === 'NUMBER') {
            this.advance();
            return {
                type: 'NumberLiteral',
                value: parseFloat(token.value),
                start: token.position,
                end: token.position + token.value.length,
            };
        }
        if (token.type === 'STRING') {
            this.advance();
            return {
                type: 'StringLiteral',
                value: token.value,
                start: token.position,
                end: token.position + token.value.length + 2,
            };
        }
        if (token.type === 'TEMPLATE_START') {
            return this.parseTemplateString();
        }
        if (token.type === 'IDENTIFIER') {
            if (token.value === 'true' || token.value === 'false') {
                this.advance();
                return {
                    type: 'BooleanLiteral',
                    value: token.value === 'true',
                    start: token.position,
                    end: token.position + token.value.length,
                };
            }
            if (token.value === 'vec2') {
                return this.parseVectorLiteral();
            }
            this.advance();
            return {
                type: 'Identifier',
                name: token.value,
                start: token.position,
                end: token.position + token.value.length,
            };
        }
        if (token.type === 'LPAREN') {
            this.advance();
            const expr = this.parseExpression();
            this.expect('RPAREN', "Expected ')' after expression");
            return expr;
        }
        throw this.error(`Unexpected token: ${token.type} (${token.value})`);
    }
    parseVectorLiteral() {
        const start = this.peek().position;
        this.advance();
        this.expect('LPAREN', "Expected '(' after 'vec2'");
        const x = this.parseExpression();
        this.expect('COMMA', "Expected ',' between vector components");
        const y = this.parseExpression();
        this.expect('RPAREN', "Expected ')' after vector components");
        return {
            type: 'VectorLiteral',
            x,
            y,
            start,
            end: this.previous().position,
        };
    }
    parseTemplateString() {
        const start = this.peek().position;
        this.advance();
        const parts = [];
        while (!this.isAtEnd()) {
            const token = this.peek();
            if (token.type === 'TEMPLATE_END') {
                this.advance();
                break;
            }
            if (token.type === 'TEMPLATE_TEXT') {
                this.advance();
                parts.push({ type: 'text', value: token.value });
            }
            else if (token.type === 'TEMPLATE_EXPR_START') {
                this.advance();
                const exprNode = this.parseExpression();
                parts.push({ type: 'expr', node: exprNode });
            }
            else {
                throw this.error(`Unexpected token in template string: ${token.type}`);
            }
        }
        return {
            type: 'TemplateString',
            parts,
            start,
            end: this.previous().position,
        };
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    expect(type, message) {
        if (this.check(type))
            return this.advance();
        throw this.error(message);
    }
    peek() {
        return this.tokens[this.current];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    isAtEnd() {
        return this.peek().type === 'EOF';
    }
    error(message) {
        const token = this.peek();
        return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
    }
}
export function parse(source) {
    return new Parser(source).parse();
}
//# sourceMappingURL=parser.js.map