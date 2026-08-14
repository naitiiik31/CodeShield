import { TokenTypes } from './types.js';

/**
 * JavaScript keyword set for structural token preservation.
 */
const JS_KEYWORDS = {
  if: TokenTypes.IF,
  else: TokenTypes.ELSE,
  for: TokenTypes.FOR,
  while: TokenTypes.WHILE,
  return: TokenTypes.RETURN,
  function: TokenTypes.FUNCTION,
  class: TokenTypes.CLASS,
  import: TokenTypes.IMPORT,
  from: TokenTypes.FROM,
  try: TokenTypes.TRY,
  catch: TokenTypes.CATCH,
  finally: TokenTypes.FINALLY,
  throw: TokenTypes.THROW,
  switch: TokenTypes.SWITCH,
  case: TokenTypes.CASE,
  default: TokenTypes.DEFAULT,
  const: TokenTypes.CONST,
  let: TokenTypes.LET,
  var: TokenTypes.VAR_KW,
  new: TokenTypes.NEW,
  this: TokenTypes.THIS,
  typeof: TokenTypes.TYPEOF,
  instanceof: TokenTypes.INSTANCEOF,
  async: TokenTypes.ASYNC,
  await: TokenTypes.AWAIT,
  in: TokenTypes.IN,
  of: 'OF',
  true: TokenTypes.TRUE,
  false: TokenTypes.FALSE,
  null: TokenTypes.NULL,
  undefined: TokenTypes.UNDEFINED,
  break: TokenTypes.BREAK,
  continue: TokenTypes.CONTINUE,
  do: TokenTypes.DO,
  export: 'EXPORT',
  extends: 'EXTENDS',
  super: TokenTypes.SUPER,
  yield: TokenTypes.YIELD,
  delete: 'DELETE',
  void: TokenTypes.VOID,
};

const MULTI_CHAR_OPS = [
  ['===', TokenTypes.SEQ],
  ['!==', TokenTypes.SNEQ],
  ['...', TokenTypes.SPREAD],
  ['=>', TokenTypes.ARROW],
  ['**', TokenTypes.POWER],
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
  ['?.', 'OPTIONAL_CHAIN'],
  ['??', 'NULLISH_COALESCE'],
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
  '~': 'BITWISE_NOT',
  '^': TokenTypes.BITWISE_XOR,
  '!': TokenTypes.NOT_OP,
  '?': TokenTypes.QUESTION,
};

export function tokenizeJavaScript(code) {
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

    if (ch === '`') {
      const startLine = line;
      const startCol = pos - lineStart;
      pos++;
      while (pos < len && code[pos] !== '`') {
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
      if (pos < len) pos++;
      tokens.push({
        type: TokenTypes.STR,
        original: 'TEMPLATE',
        line: startLine,
        column: startCol,
      });
      continue;
    }

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
      if (ch === '0' && pos + 1 < len) {
        const next = code[pos + 1].toLowerCase();
        if (next === 'x' || next === 'o' || next === 'b') {
          pos += 2;
          while (pos < len && isHexDigitOrUnderscore(code[pos])) pos++;
          tokens.push({ type: TokenTypes.NUM, original: code.substring(start, pos), line, column: startCol });
          continue;
        }
      }
      while (pos < len && isDigit(code[pos])) pos++;
      if (pos < len && code[pos] === '.') {
        pos++;
        while (pos < len && isDigit(code[pos])) pos++;
      }
      if (pos < len && (code[pos] === 'e' || code[pos] === 'E')) {
        pos++;
        if (pos < len && (code[pos] === '+' || code[pos] === '-')) pos++;
        while (pos < len && isDigit(code[pos])) pos++;
      }
      if (pos < len && code[pos] === 'n') pos++;
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

      if (JS_KEYWORDS[word]) {
        tokens.push({
          type: JS_KEYWORDS[word],
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

function isHexDigitOrUnderscore(ch) {
  return isDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F') || ch === '_';
}

function isIdentStart(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}

function isIdentChar(ch) {
  return isIdentStart(ch) || isDigit(ch);
}
