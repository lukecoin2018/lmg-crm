// app/api/test-scout/route.ts
import { NextResponse } from 'next/server';
import { runScoutAgent } from '@/lib/agents/scout/agent';

export async function GET() {
  try {
    // TEMPORARY: Hardcode your user ID for testing
    // Replace this with your actual user ID from Supabase
    const TEST_USER_ID = '70f471c7-8c10-41e1-94a0-35282ba38469';

    console.log('Running Scout Agent for user:', TEST_USER_ID);

    const result = await runScoutAgent({
      userId: TEST_USER_ID,
      niche: 'fitness',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test Scout Agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
