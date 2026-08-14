export class OpenAIProvider {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.name = 'openai';
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async analyzeSemanticSimilarity(codeA, codeB, algorithmicMetrics) {
    if (!this.isAvailable()) {
      return {
        semanticScore: -1,
        explanation: 'OpenAI API key not configured.',
        provider: 'openai',
      };
    }

    try {
      const maxChars = 3000;
      const truncA = codeA.length > maxChars ? codeA.substring(0, maxChars) + '\n// ... truncated' : codeA;
      const truncB = codeB.length > maxChars ? codeB.substring(0, maxChars) + '\n// ... truncated' : codeB;

      const prompt = `You are analyzing two code submissions for a plagiarism detection system.

IMPORTANT: You are providing an ADVISORY SIGNAL only. You are NOT making accusations.
Your analysis helps a professor make an informed decision.

Algorithmic analysis has already computed:
- Raw fingerprint similarity: ${(algorithmicMetrics.rawScore * 100).toFixed(1)}%
- Adjusted similarity (boilerplate removed): ${(algorithmicMetrics.adjustedScore * 100).toFixed(1)}%
- Matching code regions: ${algorithmicMetrics.matchedRegions}

CODE SUBMISSION A:
\`\`\`
${truncA}
\`\`\`

CODE SUBMISSION B:
\`\`\`
${truncB}
\`\`\`

Analyze the semantic similarity of these two submissions. Consider:
1. Do they implement the same algorithm/approach?
2. Is the logic structurally equivalent despite surface-level changes?
3. What are the major similarities and differences?

Respond in JSON format:
{
  "semanticScore": <float 0-1>,
  "explanation": "<2-3 sentence explanation of semantic similarity>"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      return {
        semanticScore: Math.max(0, Math.min(1, parsed.semanticScore || 0)),
        explanation: parsed.explanation || 'No explanation provided.',
        provider: 'openai',
      };
    } catch (error) {
      console.error('OpenAI semantic analysis error:', error);
      return {
        semanticScore: -1,
        explanation: `AI analysis failed: ${error.message}`,
        provider: 'openai',
      };
    }
  }
}
