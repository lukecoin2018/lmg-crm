// app/api/scout/discover/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { YouTubeSimilarityAnalyzer } from '@/lib/youtube/analyzer';

export async function POST(request: NextRequest) {
  try {
    const { youtubeHandle, userId } = await request.json();

    if (!youtubeHandle || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📥 YouTube Discovery request: @${youtubeHandle} for user ${userId}`);

    // Create analyzer and find opportunities
    const analyzer = new YouTubeSimilarityAnalyzer();
    const results = await analyzer.findSimilarCreators(youtubeHandle, userId);

    console.log(`✅ YouTube Discovery complete: ${results.brandOpportunities.length} opportunities found`);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('❌ YouTube Discovery API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Discovery failed'
      },
      { status: 500 }
    );
  }
}
