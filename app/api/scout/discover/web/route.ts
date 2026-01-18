// app/api/scout/discover/web/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBrandWebsite } from '@/lib/scraping/firecrawl';
import { scoreBrandFit } from '@/lib/ai/claude';
import type { DiscoveryResult, WebOpportunity, SearchRequest } from '@/lib/agents/scout/types';

// Service role key for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/scout/discover/web
 * Discovers brands via website scraping using Firecrawl
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: SearchRequest = await request.json();
    const { niche } = body;

    if (!niche || !niche.trim()) {
      return NextResponse.json(
        { success: false, error: 'Niche is required' },
        { status: 400 }
      );
    }

    console.log(`[Web API] Starting discovery for niche: ${niche}`);

    // Get current user
    const { data: { user } } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get brand URLs for the niche (fallback list for now)
    const brandUrls = getFallbackBrandUrls(niche);
    console.log(`[Web API] Scraping ${brandUrls.length} brand websites`);

    const opportunities: WebOpportunity[] = [];
    let successfulScrapes = 0;

    for (const url of brandUrls) {
      try {
        // Scrape website
        const scrapeResult = await scrapeBrandWebsite(url);
        
        if (!scrapeResult.success || !scrapeResult.data) {
          console.warn(`[Web API] Failed to scrape ${url}`);
          continue;
        }

        successfulScrapes++;

        const brandName = scrapeResult.data.title || extractBrandName(url);
        const description = scrapeResult.data.description || 'No description available';

        // Detect creator program
        const hasCreatorProgram = detectCreatorProgram(scrapeResult.data);
        const contactEmail = extractContactEmail(scrapeResult.data);

        // Ensure brand exists in database
        const brandId = await ensureBrandExists({
          name: brandName,
          website: url,
          description,
          niche,
          hasCreatorProgram,
          contactEmail,
        });

        if (!brandId) continue;

        // Score the brand fit
        const scoreResult = await scoreBrandFit({
          brandName,
          brandWebsite: url,
          brandDescription: description,
          creatorNiche: niche,
        });

        if (scoreResult.error) {
          console.warn(`[Web API] Failed to score ${brandName}:`, scoreResult.error);
          continue;
        }

        // Boost score if has creator program (+5 points)
        const finalScore = hasCreatorProgram
          ? Math.min(100, scoreResult.score + 5)
          : scoreResult.score;

        // Enhanced reasoning
        const reasoning = hasCreatorProgram
          ? `✅ Has Creator Program!\n\n${scoreResult.reasoning}`
          : scoreResult.reasoning;

        // Create opportunity in database
        const opportunityId = await createOpportunity({
          userId: user.id,
          brandId,
          niche,
          matchScore: finalScore,
          reasoning,
          source: 'web',
          metadata: {
            hasCreatorProgram,
            contactEmail,
          },
        });

        if (!opportunityId) continue;

        // Build web opportunity object
        opportunities.push({
          id: opportunityId,
          source: 'web',
          brandName,
          website: url,
          matchScore: finalScore,
          reasoning,
          niche,
          createdAt: new Date().toISOString(),
          webData: {
            hasCreatorProgram,
            contactEmail,
            description,
            companySize: estimateCompanySize(scrapeResult.data),
            industry: niche,
            tags: generateTags(niche, brandName),
          },
        });

        console.log(`[Web API] Processed ${brandName} (score: ${finalScore})`);
      } catch (error) {
        console.error(`[Web API] Error processing ${url}:`, error);
      }
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(`[Web API] Completed: ${opportunities.length} opportunities created`);

    return NextResponse.json<DiscoveryResult<WebOpportunity>>({
      success: true,
      source: 'web',
      opportunities: opportunities.sort((a, b) => b.matchScore - a.matchScore),
      stats: {
        itemsScraped: brandUrls.length,
        itemsAnalyzed: successfulScrapes,
        brandsDiscovered: opportunities.length,
        processingTimeMs,
      },
    });
  } catch (error) {
    console.error('[Web API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'web',
        opportunities: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Get fallback brand URLs for a niche
 */
function getFallbackBrandUrls(niche: string): string[] {
  const urlMap: Record<string, string[]> = {
    fitness: [
      'https://www.gymshark.com',
      'https://www.lululemon.com',
      'https://www.ryderwear.com',
      'https://www.alphalete.com',
      'https://www.nobull.com',
    ],
    beauty: [
      'https://www.glossier.com',
      'https://www.rarebeauty.com',
      'https://www.fentybeauty.com',
      'https://www.colourpop.com',
      'https://www.eyeslipsface.com',
    ],
    tech: [
      'https://www.anker.com',
      'https://www.dbrand.com',
      'https://www.razer.com',
      'https://www.logitech.com',
      'https://www.bluemic.com',
    ],
    fashion: [
      'https://www.fashionnova.com',
      'https://www.prettylittlething.com',
      'https://www.revolve.com',
      'https://www.asos.com',
      'https://www.zara.com',
    ],
    food: [
      'https://www.huel.com',
      'https://www.soylent.com',
      'https://www.rxbar.com',
      'https://www.kindsnacks.com',
      'https://www.perfectbar.com',
    ],
  };

  return urlMap[niche.toLowerCase()] || urlMap.fitness;
}

/**
 * Detect if brand has a creator/influencer program
 */
function detectCreatorProgram(data: any): boolean {
  const text = (data.content || data.description || '').toLowerCase();
  
  const indicators = [
    'creator program',
    'influencer program',
    'brand ambassador',
    'affiliate program',
    'partnership program',
    'collaborations',
    'work with us',
    'for creators',
    'for influencers',
  ];

  return indicators.some(indicator => text.includes(indicator));
}

/**
 * Extract contact email from scraped data
 */
function extractContactEmail(data: any): string | undefined {
  const text = data.content || data.description || '';
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  return emailMatch ? emailMatch[0] : undefined;
}

/**
 * Estimate company size based on scraped data
 */
function estimateCompanySize(data: any): 'Startup' | 'Small' | 'Medium' | 'Large' | 'Enterprise' | undefined {
  const text = (data.content || '').toLowerCase();
  
  if (text.includes('startup') || text.includes('founded 202')) return 'Startup';
  if (text.includes('fortune 500') || text.includes('enterprise')) return 'Enterprise';
  if (text.includes('global') || text.includes('worldwide')) return 'Large';
  
  return 'Medium'; // Default assumption
}

/**
 * Generate relevant tags
 */
function generateTags(niche: string, brandName: string): string[] {
  const tags = [niche];
  
  if (brandName.toLowerCase().includes('eco') || brandName.toLowerCase().includes('sustainable')) {
    tags.push('Sustainable');
  }
  
  if (brandName.toLowerCase().includes('luxury') || brandName.toLowerCase().includes('premium')) {
    tags.push('Premium');
  }
  
  return tags;
}

/**
 * Extract brand name from URL
 */
function extractBrandName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname
      .replace('www.', '')
      .replace('.com', '')
      .split('.')[0]
      .charAt(0)
      .toUpperCase() + hostname.replace('www.', '').replace('.com', '').split('.')[0].slice(1);
  } catch {
    return 'Unknown Brand';
  }
}

/**
 * Ensure brand exists in database
 */
async function ensureBrandExists(params: {
  name: string;
  website: string;
  description: string;
  niche: string;
  hasCreatorProgram: boolean;
  contactEmail?: string;
}): Promise<string | null> {
  try {
    // Check if exists
    const { data: existing } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('website', params.website)
      .single();

    if (existing) return existing.id;

    // Create new
    const { data: newBrand, error } = await supabaseAdmin
      .from('brands')
      .insert({
        name: params.name,
        website: params.website,
        description: params.description,
        industry: params.niche,
        metadata: {
          source: 'web',
          hasCreatorProgram: params.hasCreatorProgram,
          contactEmail: params.contactEmail,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Web API] Error creating brand:', error);
      return null;
    }

    return newBrand.id;
  } catch (error) {
    console.error('[Web API] ensureBrandExists error:', error);
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
      console.log('[Web API] Opportunity already exists');
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
      console.error('[Web API] Error creating opportunity:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[Web API] createOpportunity error:', error);
    return null;
  }
}
