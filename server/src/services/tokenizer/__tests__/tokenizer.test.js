import { describe, it, expect } from 'vitest';
import {
  tokenize,
  tokenizePython,
  tokenizeJavaScript,
  tokenizeJava,
  tokenizeCpp,
  tokenizeC,
  tokenizeCSharp,
  detectLanguage,
} from '../index.js';

describe('Python Tokenizer', () => {
  it('should normalize variable identifiers to VAR', () => {
    const tokens = tokenizePython('total = x + y');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['VAR', '=', 'VAR', '+', 'VAR']);
  });

  it('should normalize numeric literals to NUM', () => {
    const tokens = tokenizePython('x = 42');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['VAR', '=', 'NUM']);
  });

  it('should normalize string literals to STR', () => {
    const tokens = tokenizePython('name = "hello"');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['VAR', '=', 'STR']);
  });

  it('should preserve structural keywords', () => {
    const tokens = tokenizePython('if x > 0:\n  return y');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['IF', 'VAR', '>', 'NUM', ':', 'RETURN', 'VAR']);
  });

  it('should remove single-line comments', () => {
    const tokens = tokenizePython('x = 5 # this is a comment');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['VAR', '=', 'NUM']);
  });
});

describe('JavaScript Tokenizer', () => {
  it('should normalize identifiers and preserve keywords', () => {
    const tokens = tokenizeJavaScript('const result = getValue(input);');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['CONST', 'VAR', '=', 'VAR', '(', 'VAR', ')', ';']);
  });

  it('should remove single-line comments', () => {
    const tokens = tokenizeJavaScript('x = 5; // comment');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['VAR', '=', 'NUM', ';']);
  });
});

describe('Java Tokenizer', () => {
  it('should normalize Java classes and types', () => {
    const tokens = tokenizeJava('public class Solution { int count = 0; }');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['PUBLIC', 'CLASS', 'VAR', '{', 'TYPE', 'VAR', '=', 'NUM', ';', '}']);
  });
});

describe('C++ Tokenizer', () => {
  it('should normalize C++ preprocessor and streams', () => {
    const tokens = tokenizeCpp('#include <iostream>\nint main() { std::cout << 42; }');
    const types = tokens.map((t) => t.type);
    expect(types).toContain('INCLUDE');
    expect(types).toContain('STREAM_OUT');
    expect(types).toContain('NUM');
  });
});

describe('C Tokenizer', () => {
  it('should normalize C structs and pointers', () => {
    const tokens = tokenizeC('struct Point { int x; int y; };');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['STRUCT', 'VAR', '{', 'TYPE', 'VAR', ';', 'TYPE', 'VAR', ';', '}', ';']);
  });
});

describe('C# Tokenizer', () => {
  it('should normalize C# using and Console statements', () => {
    const tokens = tokenizeCSharp('using System; class Program { static void Main() {} }');
    const types = tokens.map((t) => t.type);
    expect(types).toContain('USING');
    expect(types).toContain('CLASS');
    expect(types).toContain('STATIC');
    expect(types).toContain('VOID');
  });
});

describe('Language Detector & Dispatcher', () => {
  it('should auto-detect Python code', () => {
    expect(detectLanguage('def calculate(arr):\n    return sum(arr)')).toBe('python');
  });

  it('should auto-detect Java code', () => {
    expect(detectLanguage('public class Main { public static void main(String[] args) {} }')).toBe('java');
  });

  it('should auto-detect C++ code', () => {
    expect(detectLanguage('#include <iostream>\nusing namespace std; int main() {}')).toBe('cpp');
  });

  it('should auto-detect C# code', () => {
    expect(detectLanguage('using System; namespace App { class Main {} }')).toBe('csharp');
  });

  it('should tokenize with auto language detection', () => {
    const tokens = tokenize('public class Test { int x = 10; }', 'auto');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.map((t) => t.type)).toContain('PUBLIC');
  });
});
