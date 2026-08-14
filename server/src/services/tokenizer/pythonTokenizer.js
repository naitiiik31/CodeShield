import { TokenTypes } from './types.js';

/**
 * Python keyword set mapping to normalized token categories.
 */
const PYTHON_KEYWORDS = {
  if: TokenTypes.IF,
  else: TokenTypes.ELSE,
  elif: TokenTypes.ELIF,
  for: TokenTypes.FOR,
  while: TokenTypes.WHILE,
  return: TokenTypes.RETURN,
  def: TokenTypes.DEF,
  class: TokenTypes.CLASS,
  import: TokenTypes.IMPORT,
  from: TokenTypes.FROM,
  try: TokenTypes.TRY,
  except: TokenTypes.EXCEPT,
  finally: TokenTypes.FINALLY,
  with: TokenTypes.WITH,
  as: TokenTypes.AS,
  in: TokenTypes.IN,
  not: TokenTypes.NOT,
  and: TokenTypes.AND,
  or: TokenTypes.OR,
  True: TokenTypes.TRUE,
  False: TokenTypes.FALSE,
  None: TokenTypes.NONE,
  break: TokenTypes.BREAK,
  continue: TokenTypes.CONTINUE,
  pass: TokenTypes.PASS,
  lambda: TokenTypes.LAMBDA,
  yield: TokenTypes.YIELD,
  raise: TokenTypes.RAISE,
  global: TokenTypes.GLOBAL,
  is: 'IS',
};

const MULTI_CHAR_OPS = [
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
  ['//', 'FLOOR_DIV'],
  ['...', TokenTypes.SPREAD],
  ['->', 'ARROW_ANNOTATION'],
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
  '@': 'AT',
  '?': TokenTypes.QUESTION,
};

export function tokenizePython(code) {
  const tokens = [];
  const lines = code.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;
    let col = 0;

    while (col < line.length) {
      const ch = line[col];

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        col++;
        continue;
      }

      if (ch === '#') {
        break;
      }

      if (ch === '"' || ch === "'") {
        const result = consumeString(line, col, lines, lineIdx);
        tokens.push({
          type: TokenTypes.STR,
          original: result.value,
          line: lineNum,
          column: col,
        });
        lineIdx = result.newLineIdx;
        col = result.newCol;
        continue;
      }

      let matchedOp = false;
      for (const [op, tokenType] of MULTI_CHAR_OPS) {
        if (line.substring(col, col + op.length) === op) {
          tokens.push({
            type: tokenType,
            original: op,
            line: lineNum,
            column: col,
          });
          col += op.length;
          matchedOp = true;
          break;
        }
      }
      if (matchedOp) continue;

      if (SINGLE_CHAR_OPS[ch]) {
        tokens.push({
          type: SINGLE_CHAR_OPS[ch],
          original: ch,
          line: lineNum,
          column: col,
        });
        col++;
        continue;
      }

      if (isDigit(ch) || (ch === '.' && col + 1 < line.length && isDigit(line[col + 1]))) {
        const start = col;
        col = consumeNumber(line, col);
        tokens.push({
          type: TokenTypes.NUM,
          original: line.substring(start, col),
          line: lineNum,
          column: start,
        });
        continue;
      }

      if (isIdentStart(ch)) {
        const start = col;
        while (col < line.length && isIdentChar(line[col])) {
          col++;
        }
        const word = line.substring(start, col);

        if (PYTHON_KEYWORDS[word]) {
          tokens.push({
            type: PYTHON_KEYWORDS[word],
            original: word,
            line: lineNum,
            column: start,
          });
        } else {
          tokens.push({
            type: TokenTypes.VAR,
            original: word,
            line: lineNum,
            column: start,
          });
        }
        continue;
      }

      col++;
    }
  }

  return tokens;
}

function consumeString(line, col, lines, lineIdx) {
  const quote = line[col];
  const isTriple = line.substring(col, col + 3) === quote.repeat(3);

  if (isTriple) {
    const closer = quote.repeat(3);
    let pos = col + 3;
    let currentLine = lineIdx;
    let currentStr = line;

    while (currentLine < lines.length) {
      const endIdx = currentStr.indexOf(closer, pos);
      if (endIdx !== -1) {
        return {
          value: 'TRIPLE_STRING',
          newCol: endIdx + 3,
          newLineIdx: currentLine,
        };
      }
      currentLine++;
      if (currentLine < lines.length) {
        currentStr = lines[currentLine];
        pos = 0;
      }
    }
    return { value: 'TRIPLE_STRING', newCol: line.length, newLineIdx: lines.length - 1 };
  }

  let pos = col + 1;
  while (pos < line.length) {
    if (line[pos] === '\\') {
      pos += 2;
      continue;
    }
    if (line[pos] === quote) {
      return { value: line.substring(col, pos + 1), newCol: pos + 1, newLineIdx: lineIdx };
    }
    pos++;
  }
  return { value: line.substring(col), newCol: line.length, newLineIdx: lineIdx };
}

function consumeNumber(line, col) {
  let pos = col;
  if (line[pos] === '0' && pos + 1 < line.length) {
    const next = line[pos + 1].toLowerCase();
    if (next === 'x' || next === 'o' || next === 'b') {
      pos += 2;
      while (pos < line.length && isHexDigit(line[pos])) pos++;
      return pos;
    }
  }
  while (pos < line.length && isDigit(line[pos])) pos++;
  if (pos < line.length && line[pos] === '.') {
    pos++;
    while (pos < line.length && isDigit(line[pos])) pos++;
  }
  if (pos < line.length && (line[pos] === 'e' || line[pos] === 'E')) {
    pos++;
    if (pos < line.length && (line[pos] === '+' || line[pos] === '-')) pos++;
    while (pos < line.length && isDigit(line[pos])) pos++;
  }
  return pos;
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
