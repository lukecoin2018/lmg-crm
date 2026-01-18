import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreatorSimilarityAnalyzer } from '../../../../../lib/instagram/analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/scout/discover/instagram
 * 
 * Discovers similar creators and their brand partnerships
 * 
 * Request body:
 * {
 *   "instagramHandle": "username",
 *   "userId": "user-id"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const { instagramHandle, userId } = body;

    // Validation
    if (!instagramHandle || typeof instagramHandle !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing instagramHandle' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    console.log(`📥 Discovery request: @${instagramHandle} for user ${userId}`);

    // Verify user exists and has access
    // Note: We skip direct auth.users check since it's protected
    // The user must pass a valid userId from their authenticated session
    // In production, verify this comes from a validated session token

    // Check rate limits
    const rateLimitOk = await checkRateLimit(userId);
    if (!rateLimitOk) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600 // 1 hour
        },
        { status: 429 }
      );
    }

    // Initialize analyzer
    const analyzer = new CreatorSimilarityAnalyzer();

    // Run the 4-stage discovery algorithm
    const result = await analyzer.findSimilarCreators(
      instagramHandle,
      userId
    );

    // Log to database for analytics
    await logDiscoveryRequest(userId, instagramHandle, result);

    // Return results
    return NextResponse.json({
      success: true,
      data: {
        similarCreators: result.similarCreators.map(creator => ({
          username: creator.username,
          fullName: creator.fullName,
          followersCount: creator.followersCount,
          biography: creator.biography,
          similarityScore: creator.similarityScore,
          reasoning: creator.reasoning,
          profileUrl: creator.url,
        })),
        brandOpportunities: result.brandOpportunities.map(opp => ({
          brand: opp.brand,
          postUrl: opp.postUrl,
          caption: opp.caption,
          engagement: opp.engagementCount,
        })),
        metadata: {
          processingTime: result.processingTime,
          cached: result.cached,
          timestamp: new Date().toISOString(),
        }
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      }
    });

  } catch (error: any) {
    console.error('❌ Discovery API error:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred';

    if (error.message?.includes('Profile not found')) {
      statusCode = 404;
      errorMessage = 'Instagram profile not found';
    } else if (error.message?.includes('API key')) {
      statusCode = 503;
      errorMessage = 'Service temporarily unavailable';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        processingTime: Date.now() - startTime,
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/scout/discover/instagram?username={username}
 * 
 * Check if cached results exist for a username
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username parameter' },
        { status: 400 }
      );
    }

    // Check cache
    const { data, error } = await supabase
      .from('similarity_cache')
      .select('created_at, similar_creators, brand_opportunities')
      .eq('username', username)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json({
        cached: false,
        message: 'No cached results found'
      });
    }

    return NextResponse.json({
      cached: true,
      data: {
        similarCreators: data.similar_creators,
        brandOpportunities: data.brand_opportunities,
        cachedAt: data.created_at,
      }
    });

  } catch (error) {
    console.error('Cache check error:', error);
    return NextResponse.json(
      { error: 'Failed to check cache' },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting helper
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    // Check how many requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('discovery_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.warn('Rate limit check failed:', error);
      return true; // Fail open
    }

    // Allow 10 requests per hour
    return !data || data.length < 10;
  } catch (error) {
    console.warn('Rate limit check error:', error);
    return true; // Fail open
  }
}

/**
 * Log discovery request for analytics
 */
async function logDiscoveryRequest(
  userId: string,
  instagramHandle: string,
  result: any
): Promise<void> {
  try {
    await supabase.from('discovery_logs').insert({
      user_id: userId,
      instagram_handle: instagramHandle,
      creators_found: result.similarCreators.length,
      brands_found: result.brandOpportunities.length,
      processing_time: result.processingTime,
      cached: result.cached,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to log discovery request:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}
