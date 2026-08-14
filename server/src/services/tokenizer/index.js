import { tokenizePython } from './pythonTokenizer.js';
import { tokenizeJavaScript } from './javascriptTokenizer.js';
import { tokenizeJava } from './javaTokenizer.js';
import { tokenizeCpp } from './cppTokenizer.js';
import { tokenizeC } from './cTokenizer.js';
import { tokenizeCSharp } from './csharpTokenizer.js';
import { detectLanguage } from './languageDetector.js';

export const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c', 'csharp'];

/**
 * Multi-language tokenization dispatcher.
 * Automatically normalizes source code for any supported programming language.
 *
 * @param {string} code - Raw source code string
 * @param {string} [language] - Optional language identifier ('python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'auto')
 * @param {string} [filename] - Optional filename for extension auto-detection
 * @returns {Array<{type: string, original: string, line: number, column: number}>} Array of normalized tokens
 */
export function tokenize(code, language = 'auto', filename = null) {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return [];
  }

  let targetLang = (language || 'auto').toLowerCase();
  if (targetLang === 'auto') {
    targetLang = detectLanguage(code, filename);
  }

  // Alias aliases to canonical language names
  if (targetLang === 'js' || targetLang === 'ts' || targetLang === 'typescript') targetLang = 'javascript';
  if (targetLang === 'py') targetLang = 'python';
  if (targetLang === 'c++' || targetLang === 'cc') targetLang = 'cpp';
  if (targetLang === 'cs' || targetLang === 'c#') targetLang = 'csharp';

  const tokenizers = {
    python: tokenizePython,
    javascript: tokenizeJavaScript,
    java: tokenizeJava,
    cpp: tokenizeCpp,
    c: tokenizeC,
    csharp: tokenizeCSharp,
  };

  const tokenizer = tokenizers[targetLang];
  if (!tokenizer) {
    // Fall back to auto-detected or javascript tokenizer
    const fallbackLang = detectLanguage(code, filename);
    const fallbackTokenizer = tokenizers[fallbackLang] || tokenizeJavaScript;
    return fallbackTokenizer(code);
  }

  return tokenizer(code);
}

export { TokenTypes } from './types.js';
export { tokenizePython } from './pythonTokenizer.js';
export { tokenizeJavaScript } from './javascriptTokenizer.js';
export { tokenizeJava } from './javaTokenizer.js';
export { tokenizeCpp } from './cppTokenizer.js';
export { tokenizeC } from './cTokenizer.js';
export { tokenizeCSharp } from './csharpTokenizer.js';
export { detectLanguage, detectLanguageFromExtension, detectLanguageFromCode } from './languageDetector.js';
