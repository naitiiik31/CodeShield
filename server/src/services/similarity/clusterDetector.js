/**
 * Union-Find (Disjoint Set Union) data structure with Path Compression & Union by Rank.
 */
export class UnionFind {
  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x) {
    if (!this.parent.has(x)) {
      this.makeSet(x);
    }
    if (this.parent.get(x) !== x) {
      // Path compression
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    // Union by rank
    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
    return true;
  }
}

/**
 * Detect plagiarism clusters from pairwise similarity results using Union-Find.
 *
 * @param {Array<Object>} pairwiseResults - List of similarity result objects
 * @param {Map<string, Object>|Object} [submissionsById=new Map()] - Map of submissionId -> submission details
 * @param {number} [threshold=0.5] - Minimum similarity score threshold for clustering
 * @returns {Array<Object>} Array of detected clusters sorted by size DESC, then avg similarity DESC
 */
export function detectClusters(pairwiseResults = [], submissionsById = new Map(), threshold = 0.5) {
  if (!Array.isArray(pairwiseResults) || pairwiseResults.length === 0) {
    return [];
  }

  const uf = new UnionFind();
  const validPairs = [];

  // Normalize submissionsById to Map
  let subMap;
  if (submissionsById instanceof Map) {
    subMap = submissionsById;
  } else if (typeof submissionsById === 'object' && submissionsById !== null) {
    subMap = new Map(Object.entries(submissionsById));
  } else {
    subMap = new Map();
  }

  // 1. Filter pairs exceeding similarity threshold and populate Union-Find
  for (const pair of pairwiseResults) {
    const score =
      typeof pair.adjustedScore === 'number'
        ? pair.adjustedScore
        : typeof pair.score === 'number'
        ? pair.score
        : typeof pair.rawScore === 'number'
        ? pair.rawScore
        : 0;

    if (score >= threshold) {
      const subA = (pair.submissionA?._id || pair.submissionA)?.toString();
      const subB = (pair.submissionB?._id || pair.submissionB)?.toString();

      if (subA && subB && subA !== subB) {
        uf.union(subA, subB);
        validPairs.push({
          pair,
          subA,
          subB,
          score,
        });
      }
    }
  }

  // 2. Group nodes by root parent
  const clustersMap = new Map(); // rootId -> Set<submissionId>

  for (const node of uf.parent.keys()) {
    const root = uf.find(node);
    if (!clustersMap.has(root)) {
      clustersMap.set(root, new Set());
    }
    clustersMap.get(root).add(node);
  }

  // 3. Process each cluster (discard clusters of size 1)
  const resultClusters = [];

  for (const [, memberSet] of clustersMap) {
    if (memberSet.size < 2) continue;

    const submissionIds = Array.from(memberSet);
    const size = submissionIds.length;

    // Find all pairwise scores and pairs within this cluster
    const clusterPairs = [];
    let scoreSum = 0;
    let maxSimilarity = 0;
    let highestPairResult = null;
    let highestPair = null;

    for (const item of validPairs) {
      if (memberSet.has(item.subA) && memberSet.has(item.subB)) {
        clusterPairs.push(item);
        scoreSum += item.score;
        if (item.score >= maxSimilarity) {
          maxSimilarity = item.score;
          highestPairResult = item.pair;
          highestPair = {
            submissionA: item.subA,
            submissionB: item.subB,
            score: item.score,
            resultId: (item.pair._id || item.pair.id)?.toString(),
          };
        }
      }
    }

    const averageSimilarity = clusterPairs.length > 0 ? scoreSum / clusterPairs.length : 0;

    // Resolve student identifiers, names, and submission timestamps
    const studentIdentifiers = [];
    const studentNames = [];
    const students = [];
    const timestamps = [];

    for (const subId of submissionIds) {
      const subDoc = subMap.get(subId);

      let identifier = subDoc?.studentIdentifier || subDoc?.studentUserId;
      let name = subDoc?.studentName || subDoc?.name;
      let submittedAt = subDoc?.submittedAt || subDoc?.createdAt;

      // Fall back to info in pairwise results if not in subMap
      if (!identifier || !name) {
        for (const item of validPairs) {
          if (item.subA === subId) {
            identifier = identifier || item.pair.studentIdentifierA;
            name = name || item.pair.studentNameA;
          } else if (item.subB === subId) {
            identifier = identifier || item.pair.studentIdentifierB;
            name = name || item.pair.studentNameB;
          }
        }
      }

      const finalId = identifier || `sub_${subId.slice(-6)}`;
      const finalName = name || finalId;

      if (!studentIdentifiers.includes(finalId)) {
        studentIdentifiers.push(finalId);
      }
      if (!studentNames.includes(finalName)) {
        studentNames.push(finalName);
      }

      if (submittedAt) {
        const timeMs = new Date(submittedAt).getTime();
        if (!isNaN(timeMs)) {
          timestamps.push(timeMs);
        }
      }

      students.push({
        submissionId: subId,
        studentIdentifier: finalId,
        studentName: finalName,
        submittedAt: submittedAt || null,
      });
    }

    // Calculate time gap in minutes if timestamps available
    let submittedWithinMinutes = null;
    if (timestamps.length >= 2) {
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      submittedWithinMinutes = Math.round((latest - earliest) / (1000 * 60));
    }

    resultClusters.push({
      id: `cluster_${submissionIds.sort().join('_').slice(0, 16)}`,
      submissionIds,
      studentIdentifiers,
      studentNames,
      students,
      size,
      averageSimilarity,
      maxSimilarity,
      highestPair,
      highestPairResultId: highestPair?.resultId || null,
      submittedWithinMinutes,
    });
  }

  // 4. Sort clusters by size DESC, then averageSimilarity DESC
  resultClusters.sort((a, b) => {
    if (b.size !== a.size) {
      return b.size - a.size;
    }
    return b.averageSimilarity - a.averageSimilarity;
  });

  return resultClusters;
}
