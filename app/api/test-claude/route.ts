// app/api/test-claude/route.ts
import { NextResponse } from 'next/server';
import { testClaudeConnection, scoreBrandFit } from '@/lib/ai/claude';

export async function GET() {
  try {
    // Test 1: Basic connection
    console.log('Testing Claude API connection...');
    const connectionTest = await testClaudeConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        details: connectionTest.error,
      }, { status: 500 });
    }

    // Test 2: Brand scoring
    console.log('Testing brand scoring...');
    const scoringTest = await scoreBrandFit({
      brandName: 'Nike',
      brandWebsite: 'https://nike.com',
      brandDescription: 'Leading athletic wear and sports equipment brand',
      creatorNiche: 'fitness',
    });

    if (scoringTest.error) {
      return NextResponse.json({
        success: false,
        error: 'Scoring test failed',
        details: scoringTest.error,
      }, { status: 500 });
    }

    // Both tests passed
    return NextResponse.json({
      success: true,
      tests: {
        connection: connectionTest,
        scoring: scoringTest,
      },
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}