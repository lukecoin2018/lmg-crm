import { NextRequest, NextResponse } from 'next/server';
import { TikTokSimilarityAnalyzer } from '@/lib/tiktok/analyzer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { tiktokHandle, userId } = await request.json();

    if (!tiktokHandle || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📥 TikTok Discovery request: @${tiktokHandle} for user ${userId}`);

    // Initialize analyzer
    const analyzer = new TikTokSimilarityAnalyzer();
    
    // Find similar creators and brand opportunities
    const results = await analyzer.findSimilarCreators(tiktokHandle, userId);

    return NextResponse.json(results);
  } catch (error) {
    console.error('❌ TikTok Discovery API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find similar creators',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
