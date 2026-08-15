import { describe, it, expect } from 'vitest';
import { computeCodeDiff, myersDiff } from '../diffEngine.js';

describe('Myers Code Diff Engine', () => {
  it('TEST 1: Identical single line text returns all equal', () => {
    const codeA = 'hello world';
    const codeB = 'hello world';
    const diff = computeCodeDiff(codeA, codeB, 'javascript');

    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBe(1);
    expect(diff.operations[0].type).toBe('equal');
    expect(diff.stats.deletions).toBe(0);
    expect(diff.stats.insertions).toBe(0);
    expect(diff.stats.modifications).toBe(0);
  });

  it('TEST 2: Single word change returns modification with token diff', () => {
    const codeA = 'hello world';
    const codeB = 'hello there';
    const diff = computeCodeDiff(codeA, codeB, 'javascript');

    expect(diff.algorithm).toBe('myers');
    expect(diff.stats.modifications).toBe(1);
    expect(diff.operations[0].type).toBe('modify');
    expect(diff.operations[0].sourceA.text).toBe('hello world');
    expect(diff.operations[0].sourceB.text).toBe('hello there');
  });

  it('TEST 3: Line deletion returns delete operation', () => {
    const codeA = 'line1\nline2\nline3';
    const codeB = 'line1\nline3';
    const diff = computeCodeDiff(codeA, codeB, 'javascript');

    expect(diff.stats.deletions).toBe(1);
    const deleteOp = diff.operations.find((op) => op.type === 'delete');
    expect(deleteOp).toBeDefined();
    expect(deleteOp.sourceA.text).toBe('line2');
    expect(deleteOp.sourceA.startLine).toBe(2);
  });

  it('TEST 4: Code modification (sum += arr[i] vs total += arr[i]) recognizes structure and token change', () => {
    const codeA = `for (int i = 0; i < n; i++) {\n    sum += arr[i];\n}`;
    const codeB = `for (int i = 0; i < n; i++) {\n    total += arr[i];\n}`;
    const diff = computeCodeDiff(codeA, codeB, 'java');

    expect(diff.algorithm).toBe('myers');
    const equalOps = diff.operations.filter((op) => op.type === 'equal');
    expect(equalOps.length).toBeGreaterThanOrEqual(1);

    const modifyOp = diff.operations.find((op) => op.type === 'modify');
    expect(modifyOp).toBeDefined();
    expect(modifyOp.sourceA.text).toContain('sum');
    expect(modifyOp.sourceB.text).toContain('total');
  });

  it('TEST 5: Identical programs return all equal matching regions', () => {
    const prog = `def calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total`;
    const diff = computeCodeDiff(prog, prog, 'python');

    expect(diff.stats.insertions).toBe(0);
    expect(diff.stats.deletions).toBe(0);
    expect(diff.stats.modifications).toBe(0);
    expect(diff.matchingRegions.length).toBe(1);
    expect(diff.matchingRegions[0].matchedLines).toBe(5);
  });

  it('TEST 6: Completely unrelated programs return few/no matching regions', () => {
    const codeA = `def print_greeting():\n    print("Hello, world!")`;
    const codeB = `class MatrixMultiplier {\n    public static void main(String[] args) {\n        System.out.println("Processing...");\n    }\n}`;
    const diff = computeCodeDiff(codeA, codeB, 'auto');

    expect(diff.matchingRegions.length).toBe(0);
    expect(diff.stats.modifications + diff.stats.deletions + diff.stats.insertions).toBeGreaterThan(0);
  });

  it('TEST 7: Common boilerplate with different implementations preserves structural differences', () => {
    const codeA = `# Starter Template\ndef solve():\n    ans = 42\n    return ans`;
    const codeB = `# Starter Template\ndef solve():\n    res = 100\n    return res`;
    const diff = computeCodeDiff(codeA, codeB, 'python');

    expect(diff.matchingRegions.length).toBeGreaterThan(0);
    const modifyOp = diff.operations.find((op) => op.type === 'modify');
    expect(modifyOp).toBeDefined();
  });

  it('TEST 8: Large files do not crash server and fall back to line-level diff', () => {
    const linesA = Array.from({ length: 1200 }, (_, i) => `line_A_${i} = ${i};`);
    const linesB = Array.from({ length: 1200 }, (_, i) => `line_B_${i} = ${i};`);

    const codeA = linesA.join('\n');
    const codeB = linesB.join('\n');

    const diff = computeCodeDiff(codeA, codeB, 'javascript');
    expect(diff.algorithm).toBe('myers');
    expect(diff.granularity).toBe('line');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 9: Python diff support', () => {
    const codeA = `def add(a, b):\n    return a + b`;
    const codeB = `def add(x, y):\n    return x + y`;
    const diff = computeCodeDiff(codeA, codeB, 'python');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 10: JavaScript diff support', () => {
    const codeA = `const greet = (name) => 'Hello ' + name;`;
    const codeB = `const greet = (user) => 'Hello ' + user;`;
    const diff = computeCodeDiff(codeA, codeB, 'javascript');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 11: Java diff support', () => {
    const codeA = `public class Main {\n    public static void main(String[] args) {\n        int x = 10;\n    }\n}`;
    const codeB = `public class Main {\n    public static void main(String[] args) {\n        int y = 20;\n    }\n}`;
    const diff = computeCodeDiff(codeA, codeB, 'java');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 12: C diff support', () => {
    const codeA = `#include <stdio.h>\nint main() {\n    printf("Hello\\n");\n    return 0;\n}`;
    const codeB = `#include <stdio.h>\nint main() {\n    printf("World\\n");\n    return 0;\n}`;
    const diff = computeCodeDiff(codeA, codeB, 'c');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 13: C++ diff support', () => {
    const codeA = `#include <iostream>\nusing namespace std;\nint main() { cout << "A"; }`;
    const codeB = `#include <iostream>\nusing namespace std;\nint main() { cout << "B"; }`;
    const diff = computeCodeDiff(codeA, codeB, 'cpp');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });

  it('TEST 14: C# diff support', () => {
    const codeA = `using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("A");\n    }\n}`;
    const codeB = `using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("B");\n    }\n}`;
    const diff = computeCodeDiff(codeA, codeB, 'csharp');
    expect(diff.algorithm).toBe('myers');
    expect(diff.operations.length).toBeGreaterThan(0);
  });
});
