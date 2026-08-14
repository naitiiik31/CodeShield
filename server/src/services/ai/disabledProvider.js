export class DisabledProvider {
  constructor() {
    this.name = 'disabled';
  }

  isAvailable() {
    return false;
  }

  async analyzeSemanticSimilarity() {
    return {
      semanticScore: -1,
      explanation: 'AI semantic analysis is not configured.',
      provider: 'disabled',
    };
  }
}
