// lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

export async function testClaudeConnection(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "Claude API is working!" and nothing else.',
        },
      ],
    });

    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    return {
      success: true,
      message: text,
    };
  } catch (error) {
    console.error('Claude API Error:', error);
    return {
      success: false,
      message: 'Failed to connect to Claude API',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function scoreBrandFit(params: {
  brandName: string;
  brandWebsite: string;
  brandDescription: string;
  creatorNiche: string;
}): Promise<{
  score: number;
  reasoning: string;
  error?: string;
}> {
  const { brandName, brandWebsite, brandDescription, creatorNiche } = params;

  try {
    const prompt = `You are analyzing brand partnership opportunities for content creators.

CREATOR'S NICHE: ${creatorNiche}

BRAND TO ANALYZE:
- Name: ${brandName}
- Website: ${brandWebsite}
- Description: ${brandDescription}

TASK: Score this brand's fit for partnerships with creators in the "${creatorNiche}" niche.

Consider:
1. Industry alignment (does the brand serve the niche's audience?)
2. Partnership potential (do they likely work with creators?)
3. Budget likelihood (can they afford creator partnerships?)
4. Brand reputation and quality
5. Audience overlap

Respond ONLY in this exact JSON format (no markdown, no backticks):
{
  "score": <number 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>"
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    const parsed = JSON.parse(text.trim());

    return {
      score: Math.min(100, Math.max(0, parsed.score)),
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Claude Scoring Error:', error);
    return {
      score: 0,
      reasoning: 'Failed to score brand fit',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function scoreBrandsBatch(params: {
  brands: Array<{
    name: string;
    website: string;
    description: string;
  }>;
  creatorNiche: string;
}): Promise<Array<{
  brandName: string;
  score: number;
  reasoning: string;
  error?: string;
}>> {
  const { brands, creatorNiche } = params;
  const results: Array<{
    brandName: string;
    score: number;
    reasoning: string;
    error?: string;
  }> = [];

  for (const brand of brands) {
    const result = await scoreBrandFit({
      brandName: brand.name,
      brandWebsite: brand.website,
      brandDescription: brand.description,
      creatorNiche,
    });

    results.push({
      brandName: brand.name,
      score: result.score,
      reasoning: result.reasoning,
      error: result.error,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}