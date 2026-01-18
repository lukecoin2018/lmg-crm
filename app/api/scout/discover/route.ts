// app/api/scout/discover/route.ts
import { NextResponse } from 'next/server';
import { runScoutAgent } from '@/lib/agents/scout/agent';

export async function POST(request: Request) {
  try {
    // TEMPORARY: Use hardcoded user ID
    const TEST_USER_ID = '70f471c7-8c10-41e1-94a0-35282ba38469';

    const { niche } = await request.json();

    if (!niche || typeof niche !== 'string') {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    console.log(`Running Scout Agent for user ${TEST_USER_ID}, niche: ${niche}`);

    const result = await runScoutAgent({
      userId: TEST_USER_ID,
      niche: niche.toLowerCase().trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scout Agent API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}