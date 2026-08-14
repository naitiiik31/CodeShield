import { TokenTypes } from './types.js';

const CSHARP_KEYWORDS = {
  if: TokenTypes.IF,
  else: TokenTypes.ELSE,
  for: TokenTypes.FOR,
  foreach: TokenTypes.FOR,
  while: TokenTypes.WHILE,
  do: TokenTypes.DO,
  return: TokenTypes.RETURN,
  class: TokenTypes.CLASS,
  struct: TokenTypes.STRUCT,
  interface: TokenTypes.CLASS,
  namespace: TokenTypes.NAMESPACE,
  using: TokenTypes.USING,
  public: TokenTypes.PUBLIC,
  private: TokenTypes.PRIVATE,
  protected: TokenTypes.PROTECTED,
  internal: TokenTypes.PRIVATE,
  static: TokenTypes.STATIC,
  const: TokenTypes.CONST,
  void: TokenTypes.VOID,
  var: TokenTypes.VAR_KW,
  int: TokenTypes.TYPE,
  double: TokenTypes.TYPE,
  float: TokenTypes.TYPE,
  string: TokenTypes.TYPE,
  bool: TokenTypes.TYPE,
  char: TokenTypes.TYPE,
  long: TokenTypes.TYPE,
  short: TokenTypes.TYPE,
  byte: TokenTypes.TYPE,
  object: TokenTypes.TYPE,
  decimal: TokenTypes.TYPE,
  try: TokenTypes.TRY,
  catch: TokenTypes.CATCH,
  finally: TokenTypes.FINALLY,
  throw: TokenTypes.THROW,
  async: TokenTypes.ASYNC,
  await: TokenTypes.AWAIT,
  new: TokenTypes.NEW,
  this: TokenTypes.THIS,
  base: TokenTypes.SUPER,
  switch: TokenTypes.SWITCH,
  case: TokenTypes.CASE,
  default: TokenTypes.DEFAULT,
  null: TokenTypes.NULL,
  true: TokenTypes.TRUE,
  false: TokenTypes.FALSE,
  break: TokenTypes.BREAK,
  continue: TokenTypes.CONTINUE,
  typeof: TokenTypes.TYPEOF,
  is: 'IS',
  as: TokenTypes.AS,
  in: TokenTypes.IN,
};

const MULTI_CHAR_OPS = [
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
  ['=>', TokenTypes.ARROW],
  ['??', 'NULLISH_COALESCE'],
  ['?.', 'OPTIONAL_CHAIN'],
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

export function tokenizeCSharp(code) {
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

    // Attributes like [HttpGet], [Serializable]
    if (ch === '[' && pos + 1 < len && isIdentStart(code[pos + 1])) {
      const startCol = pos - lineStart;
      tokens.push({
        type: TokenTypes.LBRACKET,
        original: '[',
        line,
        column: startCol,
      });
      pos++;
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

    // String literals including verbatim @"..." and interpolated $"..."
    if (ch === '"' || ch === "'" || (ch === '@' && pos + 1 < len && code[pos + 1] === '"') || (ch === '$' && pos + 1 < len && code[pos + 1] === '"')) {
      const startCol = pos - lineStart;
      if (ch === '@' || ch === '$') pos++;
      const quote = code[pos];
      pos++;
      while (pos < len && code[pos] !== quote) {
        if (code[pos] === '\\') {
          pos += 2;
          continue;
        }
        if (code[pos] === '\n') {
          line++;
          lineStart = pos + 1;
        }
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
      if (pos < len && /[uUlLfFdDmM]/.test(code[pos])) pos++;
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

      if (CSHARP_KEYWORDS[word]) {
        tokens.push({
          type: CSHARP_KEYWORDS[word],
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
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentChar(ch) {
  return isIdentStart(ch) || isDigit(ch);
}
