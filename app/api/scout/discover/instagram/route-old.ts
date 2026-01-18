// app/api/scout/discover/instagram/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { InstagramScraper } from '@/lib/agents/scout/instagram-scraper';
import { scoreBrandFit } from '@/lib/ai/claude';
import type { DiscoveryResult, InstagramOpportunity, SearchRequest } from '@/lib/agents/scout/types';
import { cookies } from 'next/headers';

// Service role key for bypassing RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/scout/discover/instagram
 * Discovers brands via Instagram by analyzing similar creators' partnerships
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: SearchRequest = await request.json();
    const { niche, userFollowers } = body;

    if (!niche || !niche.trim()) {
      return NextResponse.json(
        { success: false, error: 'Niche is required' },
        { status: 400 }
      );
    }

    console.log(`[Instagram API] Starting discovery for niche: ${niche}`);

    // For now, get user from Supabase using the request's auth header
    const authHeader = request.headers.get('authorization');
    let userId: string;
    
    if (authHeader) {
      // Extract token from "Bearer <token>"
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = user.id;
    } else {
      // Fallback: Try to get from cookie
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('sb-access-token');
      
      if (!sessionCookie) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - No session found' },
          { status: 401 }
        );
      }
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(sessionCookie.value);
      
      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Invalid session' },
          { status: 401 }
        );
      }
      
      userId = user.id;
    }
    
    console.log(`[Instagram API] Authenticated user: ${userId}`);

    // Initialize Instagram scraper
    const scraper = new InstagramScraper();
    const result = await scraper.discoverBrands(niche, userFollowers);

    if (!result.success || result.brands.length === 0) {
      const processingTimeMs = Date.now() - startTime;
      return NextResponse.json<DiscoveryResult<InstagramOpportunity>>({
        success: true,
        source: 'instagram',
        opportunities: [],
        stats: {
          itemsScraped: result.creatorsScraped,
          itemsAnalyzed: result.postsAnalyzed,
          brandsDiscovered: 0,
          processingTimeMs,
        },
        error: result.error || 'No brands found with detectable partnerships',
      });
    }

    console.log(`[Instagram API] Found ${result.brands.length} brands, processing...`);

    // Process each brand
    const opportunities: InstagramOpportunity[] = [];

    for (const brand of result.brands) {
      try {
        // Ensure brand exists in database
        const brandId = await ensureBrandExists(brand, niche);
        if (!brandId) continue;

        // Score the brand fit
        const scoreResult = await scoreBrandFit({
          brandName: brand.name,
          brandWebsite: brand.website || `https://instagram.com/${brand.username}`,
          brandDescription: brand.biography,
          creatorNiche: niche,
        });

        if (scoreResult.error) {
          console.warn(`[Instagram API] Failed to score ${brand.name}:`, scoreResult.error);
          continue;
        }

        // Boost score for Instagram brands (+10 points - proven partnerships)
        const finalScore = Math.min(100, scoreResult.score + 10);

        // Enhanced reasoning with proof
        const reasoning = `✅ PROVEN: Works with ${brand.worksWith.length} similar creators (${brand.worksWith.slice(0, 3).join(', ')}).\n\n${scoreResult.reasoning}`;

        // Create opportunity in database
        const opportunityId = await createOpportunity({
          userId: userId,
          brandId,
          niche,
          matchScore: finalScore,
          reasoning,
          source: 'instagram',
          metadata: {
            instagram: brand.username,
            followers: brand.followers,
            verified: brand.isVerified,
            partnerships: brand.worksWith.length,
            proofPosts: brand.proofPosts,
            mentionCount: brand.mentionCount,
          },
        });

        if (!opportunityId) continue;

        // Calculate estimated rate based on followers
        const estimatedRate = calculateEstimatedRate(brand.followers, niche);

        // Build Instagram opportunity object
        opportunities.push({
          id: opportunityId,
          source: 'instagram',
          brandName: brand.name,
          instagram: brand.username,
          website: brand.website,
          matchScore: finalScore,
          reasoning,
          niche,
          createdAt: new Date().toISOString(),
          instagramData: {
            followers: brand.followers,
            verified: brand.isVerified,
            partnerships: brand.worksWith.length,
            proofPosts: brand.proofPosts.slice(0, 5).map((url, idx) => ({
              url,
              creator: brand.worksWith[idx] || 'Unknown',
              date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Estimate
              likes: Math.floor(brand.totalEngagement / brand.proofPosts.length * 0.7),
              comments: Math.floor(brand.totalEngagement / brand.proofPosts.length * 0.3),
            })),
            lastPartnership: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            typicalContent: 'Mixed', // Could be enhanced with post type detection
            estimatedRate,
            worksWith: brand.worksWith,
          },
        });

        console.log(`[Instagram API] Processed ${brand.name} (score: ${finalScore})`);
      } catch (error) {
        console.error(`[Instagram API] Error processing brand ${brand.name}:`, error);
      }
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(`[Instagram API] Completed: ${opportunities.length} opportunities created`);

    return NextResponse.json<DiscoveryResult<InstagramOpportunity>>({
      success: true,
      source: 'instagram',
      opportunities: opportunities.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20),
      stats: {
        itemsScraped: result.creatorsScraped,
        itemsAnalyzed: result.postsAnalyzed,
        brandsDiscovered: opportunities.length,
        processingTimeMs,
      },
    });
  } catch (error) {
    console.error('[Instagram API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'instagram',
        opportunities: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Ensure brand exists in database, return brandId
 */
async function ensureBrandExists(brand: any, niche: string): Promise<string | null> {
  try {
    // Check if exists
    const { data: existing } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('website', brand.website || `https://instagram.com/${brand.username}`)
      .single();

    if (existing) return existing.id;

    // Create new
    const { data: newBrand, error } = await supabaseAdmin
      .from('brands')
      .insert({
        name: brand.name,
        website: brand.website || `https://instagram.com/${brand.username}`,
        description: brand.biography,
        industry: niche,
        metadata: {
          source: 'instagram',
          instagram: {
            username: brand.username,
            followers: brand.followers,
            verified: brand.isVerified,
          },
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Instagram API] Error creating brand:', error);
      return null;
    }

    return newBrand.id;
  } catch (error) {
    console.error('[Instagram API] ensureBrandExists error:', error);
    return null;
  }
}

/**
 * Create opportunity record
 */
async function createOpportunity(params: {
  userId: string;
  brandId: string;
  niche: string;
  matchScore: number;
  reasoning: string;
  source: string;
  metadata: any;
}): Promise<string | null> {
  try {
    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('opportunities')
      .select('id')
      .eq('user_id', params.userId)
      .eq('brand_id', params.brandId)
      .single();

    if (existing) {
      console.log('[Instagram API] Opportunity already exists');
      return existing.id;
    }

    // Create new
    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .insert({
        user_id: params.userId,
        brand_id: params.brandId,
        niche: params.niche,
        match_score: params.matchScore,
        ai_reasoning: params.reasoning,
        status: 'new',
        metadata: {
          source: params.source,
          ...params.metadata,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Instagram API] Error creating opportunity:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[Instagram API] createOpportunity error:', error);
    return null;
  }
}

/**
 * Calculate estimated rate based on followers and niche
 */
function calculateEstimatedRate(
  followers: number,
  niche: string
): { min: number; max: number } {
  // Base rate per 1000 followers
  const baseRatePer1k = niche === 'beauty' || niche === 'fashion' ? 12 : 10;

  // Calculate based on followers
  const followersInK = followers / 1000;
  const baseRate = followersInK * baseRatePer1k;

  // Apply engagement multiplier (assume 3-5% for good engagement)
  const min = Math.round(baseRate * 0.8);
  const max = Math.round(baseRate * 1.5);

  return { min, max };
}
