import { TokenTypes } from './types.js';

const JAVA_KEYWORDS = {
  if: TokenTypes.IF,
  else: TokenTypes.ELSE,
  for: TokenTypes.FOR,
  while: TokenTypes.WHILE,
  do: TokenTypes.DO,
  return: TokenTypes.RETURN,
  class: TokenTypes.CLASS,
  interface: TokenTypes.CLASS,
  enum: TokenTypes.CLASS,
  public: TokenTypes.PUBLIC,
  private: TokenTypes.PRIVATE,
  protected: TokenTypes.PROTECTED,
  static: TokenTypes.STATIC,
  final: TokenTypes.FINAL,
  void: TokenTypes.VOID,
  int: TokenTypes.TYPE,
  double: TokenTypes.TYPE,
  float: TokenTypes.TYPE,
  boolean: TokenTypes.TYPE,
  char: TokenTypes.TYPE,
  long: TokenTypes.TYPE,
  short: TokenTypes.TYPE,
  byte: TokenTypes.TYPE,
  String: TokenTypes.TYPE,
  try: TokenTypes.TRY,
  catch: TokenTypes.CATCH,
  finally: TokenTypes.FINALLY,
  throw: TokenTypes.THROW,
  throws: TokenTypes.THROW,
  new: TokenTypes.NEW,
  this: TokenTypes.THIS,
  super: TokenTypes.SUPER,
  import: TokenTypes.IMPORT,
  package: TokenTypes.IMPORT,
  switch: TokenTypes.SWITCH,
  case: TokenTypes.CASE,
  default: TokenTypes.DEFAULT,
  null: TokenTypes.NULL,
  true: TokenTypes.TRUE,
  false: TokenTypes.FALSE,
  break: TokenTypes.BREAK,
  continue: TokenTypes.CONTINUE,
  instanceof: TokenTypes.INSTANCEOF,
};

const MULTI_CHAR_OPS = [
  ['...', TokenTypes.SPREAD],
  ['==', TokenTypes.EQ],
  ['!=', TokenTypes.NEQ],
  ['<=', TokenTypes.LTE],
  ['>=', TokenTypes.GTE],
  ['+=', TokenTypes.PLUS_ASSIGN],
  ['-=', TokenTypes.MINUS_ASSIGN],
  ['*=', TokenTypes.MULT_ASSIGN],
  ['/=', TokenTypes.DIV_ASSIGN],
  ['%=', TokenTypes.MOD_ASSIGN],
  ['&&', TokenTypes.LOGICAL_AND],
  ['||', TokenTypes.LOGICAL_OR],
  ['++', TokenTypes.INC],
  ['--', TokenTypes.DEC],
  ['->', TokenTypes.ARROW],
];

const SINGLE_CHAR_OPS = {
  '=': TokenTypes.ASSIGN,
  '+': TokenTypes.PLUS,
  '-': TokenTypes.MINUS,
  '*': TokenTypes.MULT,
  '/': TokenTypes.DIV,
  '%': TokenTypes.MOD,
  '<': TokenTypes.LT,
  '>': TokenTypes.GT,
  '.': TokenTypes.DOT,
  ',': TokenTypes.COMMA,
  ':': TokenTypes.COLON,
  ';': TokenTypes.SEMICOLON,
  '(': TokenTypes.LPAREN,
  ')': TokenTypes.RPAREN,
  '[': TokenTypes.LBRACKET,
  ']': TokenTypes.RBRACKET,
  '{': TokenTypes.LBRACE,
  '}': TokenTypes.RBRACE,
  '&': TokenTypes.BITWISE_AND,
  '|': TokenTypes.BITWISE_OR,
  '^': TokenTypes.BITWISE_XOR,
  '!': TokenTypes.NOT_OP,
  '?': TokenTypes.QUESTION,
};

export function tokenizeJava(code) {
  const tokens = [];
  const len = code.length;
  let pos = 0;
  let line = 1;
  let lineStart = 0;

  while (pos < len) {
    const ch = code[pos];

    if (ch === '\n') {
      line++;
      lineStart = pos + 1;
      pos++;
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      pos++;
      continue;
    }

    // Skip annotations (@Override, @Test, etc.)
    if (ch === '@') {
      pos++;
      while (pos < len && isIdentChar(code[pos])) pos++;
      continue;
    }

    if (ch === '/' && pos + 1 < len && code[pos + 1] === '/') {
      while (pos < len && code[pos] !== '\n') pos++;
      continue;
    }

    if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
      pos += 2;
      while (pos < len - 1) {
        if (code[pos] === '\n') {
          line++;
          lineStart = pos + 1;
        }
        if (code[pos] === '*' && code[pos + 1] === '/') {
          pos += 2;
          break;
        }
        pos++;
      }
      continue;
    }

    // Double-quoted strings or single-quoted chars
    if (ch === '"' || ch === "'") {
      const startCol = pos - lineStart;
      const quote = ch;
      pos++;
      while (pos < len && code[pos] !== quote) {
        if (code[pos] === '\\') {
          pos += 2;
          continue;
        }
        if (code[pos] === '\n') break;
        pos++;
      }
      if (pos < len && code[pos] === quote) pos++;
      tokens.push({
        type: TokenTypes.STR,
        original: 'STRING',
        line,
        column: startCol,
      });
      continue;
    }

    let matchedOp = false;
    for (const [op, tokenType] of MULTI_CHAR_OPS) {
      if (code.substring(pos, pos + op.length) === op) {
        tokens.push({
          type: tokenType,
          original: op,
          line,
          column: pos - lineStart,
        });
        pos += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) continue;

    if (SINGLE_CHAR_OPS[ch]) {
      tokens.push({
        type: SINGLE_CHAR_OPS[ch],
        original: ch,
        line,
        column: pos - lineStart,
      });
      pos++;
      continue;
    }

    if (isDigit(ch)) {
      const start = pos;
      const startCol = pos - lineStart;
      if (ch === '0' && pos + 1 < len && (code[pos + 1] === 'x' || code[pos + 1] === 'X')) {
        pos += 2;
        while (pos < len && isHexDigit(code[pos])) pos++;
      } else {
        while (pos < len && isDigit(code[pos])) pos++;
        if (pos < len && code[pos] === '.') {
          pos++;
          while (pos < len && isDigit(code[pos])) pos++;
        }
      }
      // Integer/float suffixes L, f, d
      if (pos < len && /[LfdFD]/.test(code[pos])) pos++;
      tokens.push({
        type: TokenTypes.NUM,
        original: code.substring(start, pos),
        line,
        column: startCol,
      });
      continue;
    }

    if (isIdentStart(ch)) {
      const start = pos;
      const startCol = pos - lineStart;
      while (pos < len && isIdentChar(code[pos])) pos++;
      const word = code.substring(start, pos);

      if (JAVA_KEYWORDS[word]) {
        tokens.push({
          type: JAVA_KEYWORDS[word],
          original: word,
          line,
          column: startCol,
        });
      } else {
        tokens.push({
          type: TokenTypes.VAR,
          original: word,
          line,
          column: startCol,
        });
      }
      continue;
    }

    pos++;
  }

  return tokens;
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isHexDigit(ch) {
  return isDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F') || ch === '_';
}

function isIdentStart(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}

function isIdentChar(ch) {
  return isIdentStart(ch) || isDigit(ch);
}
