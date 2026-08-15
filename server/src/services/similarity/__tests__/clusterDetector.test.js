import { describe, it, expect } from 'vitest';
import { detectClusters, UnionFind } from '../clusterDetector.js';

describe('Plagiarism Cluster Detector (Union-Find)', () => {
  it('UnionFind class basic operations (makeSet, find, union, path compression)', () => {
    const uf = new UnionFind();
    uf.makeSet('A');
    uf.makeSet('B');
    uf.makeSet('C');

    expect(uf.find('A')).toBe('A');
    expect(uf.find('B')).toBe('B');

    uf.union('A', 'B');
    expect(uf.find('A')).toBe(uf.find('B'));

    uf.union('B', 'C');
    expect(uf.find('A')).toBe(uf.find('C'));
  });

  it('TEST A: 4 submissions all pairwise similar above threshold -> 1 cluster of size 4', () => {
    const pairwiseResults = [
      { submissionA: 'sub1', submissionB: 'sub2', adjustedScore: 0.85, studentIdentifierA: 'st1', studentIdentifierB: 'st2' },
      { submissionA: 'sub1', submissionB: 'sub3', adjustedScore: 0.90, studentIdentifierA: 'st1', studentIdentifierB: 'st3' },
      { submissionA: 'sub1', submissionB: 'sub4', adjustedScore: 0.80, studentIdentifierA: 'st1', studentIdentifierB: 'st4' },
      { submissionA: 'sub2', submissionB: 'sub3', adjustedScore: 0.88, studentIdentifierA: 'st2', studentIdentifierB: 'st3' },
      { submissionA: 'sub2', submissionB: 'sub4', adjustedScore: 0.75, studentIdentifierA: 'st2', studentIdentifierB: 'st4' },
      { submissionA: 'sub3', submissionB: 'sub4', adjustedScore: 0.82, studentIdentifierA: 'st3', studentIdentifierB: 'st4' },
    ];

    const clusters = detectClusters(pairwiseResults, new Map(), 0.5);

    expect(clusters.length).toBe(1);
    expect(clusters[0].size).toBe(4);
    expect(clusters[0].submissionIds.sort()).toEqual(['sub1', 'sub2', 'sub3', 'sub4']);
    expect(clusters[0].maxSimilarity).toBe(0.90);
    expect(clusters[0].averageSimilarity).toBeGreaterThan(0.80);
  });

  it('TEST B: Two separate groups (A-B similar, C-D similar, no cross-similarity) -> 2 clusters of size 2', () => {
    const pairwiseResults = [
      { submissionA: 'subA', submissionB: 'subB', adjustedScore: 0.78, studentIdentifierA: 'Alice', studentIdentifierB: 'Bob' },
      { submissionA: 'subC', submissionB: 'subD', adjustedScore: 0.92, studentIdentifierA: 'Charlie', studentIdentifierB: 'David' },
      { submissionA: 'subA', submissionB: 'subC', adjustedScore: 0.20, studentIdentifierA: 'Alice', studentIdentifierB: 'Charlie' },
      { submissionA: 'subB', submissionB: 'subD', adjustedScore: 0.15, studentIdentifierA: 'Bob', studentIdentifierB: 'David' },
    ];

    const clusters = detectClusters(pairwiseResults, new Map(), 0.5);

    expect(clusters.length).toBe(2);
    expect(clusters[0].size).toBe(2);
    expect(clusters[1].size).toBe(2);

    // Sorted by size DESC, then avg similarity DESC
    expect(clusters[0].averageSimilarity).toBe(0.92);
    expect(clusters[0].studentIdentifiers).toEqual(['Charlie', 'David']);
    expect(clusters[1].averageSimilarity).toBe(0.78);
    expect(clusters[1].studentIdentifiers).toEqual(['Alice', 'Bob']);
  });

  it('TEST C: All pairs below threshold -> 0 clusters returned', () => {
    const pairwiseResults = [
      { submissionA: 'sub1', submissionB: 'sub2', adjustedScore: 0.35 },
      { submissionA: 'sub2', submissionB: 'sub3', adjustedScore: 0.40 },
      { submissionA: 'sub3', submissionB: 'sub4', adjustedScore: 0.25 },
    ];

    const clusters = detectClusters(pairwiseResults, new Map(), 0.5);

    expect(clusters).toEqual([]);
  });

  it('TEST D: A single unmatched submission among clustered ones -> excluded from any cluster', () => {
    const pairwiseResults = [
      { submissionA: 'subA', submissionB: 'subB', adjustedScore: 0.88, studentIdentifierA: 'UserA', studentIdentifierB: 'UserB' },
      { submissionA: 'subB', submissionB: 'subC', adjustedScore: 0.82, studentIdentifierA: 'UserB', studentIdentifierB: 'UserC' },
      { submissionA: 'subA', submissionB: 'subSolo', adjustedScore: 0.10, studentIdentifierA: 'UserA', studentIdentifierB: 'SoloUser' },
    ];

    const clusters = detectClusters(pairwiseResults, new Map(), 0.5);

    expect(clusters.length).toBe(1);
    expect(clusters[0].size).toBe(3);
    expect(clusters[0].submissionIds).not.toContain('subSolo');
  });

  it('Computes submittedWithinMinutes correctly when submission timestamps are provided', () => {
    const submissionsById = new Map([
      ['sub1', { studentIdentifier: 'st1', submittedAt: '2026-08-15T10:00:00Z' }],
      ['sub2', { studentIdentifier: 'st2', submittedAt: '2026-08-15T10:15:00Z' }],
      ['sub3', { studentIdentifier: 'st3', submittedAt: '2026-08-15T10:45:00Z' }],
    ]);

    const pairwiseResults = [
      { submissionA: 'sub1', submissionB: 'sub2', adjustedScore: 0.85 },
      { submissionA: 'sub2', submissionB: 'sub3', adjustedScore: 0.80 },
    ];

    const clusters = detectClusters(pairwiseResults, submissionsById, 0.5);

    expect(clusters.length).toBe(1);
    expect(clusters[0].submittedWithinMinutes).toBe(45); // 10:00 to 10:45 is 45 minutes
  });
});
