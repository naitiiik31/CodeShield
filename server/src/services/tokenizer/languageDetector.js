/**
 * Language Detector for CodeGuard.
 * Automatically identifies source code language from content heuristics or file extension.
 * Supported languages: 'python', 'javascript', 'java', 'cpp', 'c', 'csharp'
 */

export const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c', 'csharp'];

/**
 * Detect language from file extension.
 * @param {string} filename - File name or path
 * @returns {string|null} Detected language identifier or null
 */
export function detectLanguageFromExtension(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'py':
      return 'python';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'java':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'h++':
      return 'cpp';
    case 'c':
    case 'h':
      return 'c';
    case 'cs':
      return 'csharp';
    default:
      return null;
  }
}

/**
 * Detect language from source code content heuristics.
 * @param {string} code - Source code string
 * @returns {string} Detected language identifier (defaults to 'javascript' if uncertain)
 */
export function detectLanguageFromCode(code) {
  if (!code || typeof code !== 'string') {
    return 'javascript';
  }

  const text = code.trim();
  if (!text) return 'javascript';

  // C# indicators
  if (/using\s+System(\.[A-Za-z0-9_]+)*\s*;/.test(text) ||
      /Console\.Write(Line)?\s*\(/.test(text) ||
      /namespace\s+[A-Za-z0-9_.]+\s*\{/.test(text)) {
    return 'csharp';
  }

  // C++ indicators
  if (/#include\s*<iostream>/.test(text) ||
      /#include\s*<(vector|string|map|set|algorithm|iostream|cmath|memory|utility)>/.test(text) ||
      /std::(cout|cin|endl|vector|string|map|set)/.test(text) ||
      /cout\s*<</.test(text) ||
      /cin\s*>>/.test(text) ||
      /using\s+namespace\s+std\s*;/.test(text) ||
      /template\s*</.test(text)) {
    return 'cpp';
  }

  // C indicators (when C++ headers absent)
  if (/#include\s*<stdio\.h>/.test(text) ||
      /#include\s*<(stdlib|string|math|time|assert|stdbool)\.h>/.test(text) ||
      /printf\s*\(/.test(text) ||
      /scanf\s*\(/.test(text)) {
    return 'c';
  }

  // Java indicators
  if (/import\s+java\.[a-z0-9_.]+/i.test(text) ||
      /public\s+class\s+[A-Za-z0-9_]+/.test(text) ||
      /public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]/.test(text) ||
      /System\.out\.print(ln)?\s*\(/.test(text)) {
    return 'java';
  }

  // Python indicators
  if (/def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*?\)\s*:/.test(text) ||
      /from\s+[a-zA-Z_][a-zA-Z0-9_.]*\s+import/.test(text) ||
      /import\s+[a-zA-Z_][a-zA-Z0-9_.]*/.test(text) && text.includes(':') ||
      /print\s*\(.*?\)/.test(text) && !text.includes(';') && (text.includes('def ') || text.includes('elif '))) {
    return 'python';
  }

  // JS/TS indicators
  if (/const\s+|let\s+|var\s+/.test(text) ||
      /function\s+[a-zA-Z_]/.test(text) ||
      /=>/.test(text) ||
      /console\.log\s*\(/.test(text) ||
      /export\s+(default|const|function|class)/.test(text) ||
      /import\s+.*?\s+from\s+['"]/.test(text)) {
    return 'javascript';
  }

  // Generic fallback checks based on structure
  if (text.includes('#include')) {
    return text.includes('cout') || text.includes('std::') ? 'cpp' : 'c';
  }
  if (text.includes('def ') || text.includes('elif ')) {
    return 'python';
  }
  if (text.includes('public class')) {
    return 'java';
  }

  return 'javascript';
}

/**
 * Detect language combining file extension and code heuristics.
 * @param {string} code - Source code
 * @param {string} [filename] - Optional filename
 * @returns {string} Normalized language identifier
 */
export function detectLanguage(code, filename) {
  if (filename) {
    const extLang = detectLanguageFromExtension(filename);
    if (extLang) return extLang;
  }
  return detectLanguageFromCode(code);
}
