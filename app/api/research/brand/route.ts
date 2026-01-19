// app/api/research/brand/route.ts
// API endpoint for brand research

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  BrandResearch,
  ResearchBrandRequest,
  ResearchBrandResponse,
  CreatorProfile,
} from '@/types/research';
import {
  scrapeCompanyInfo,
  findContactInfo,
  analyzeCreatorProgram,
  findRecentCampaigns,
  generatePitchStrategy,
  generatePitchEmail,
} from '@/lib/agents/research/brand-researcher';
import { normalizeBrandName } from '@/lib/agents/research/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body: ResearchBrandRequest = await req.json();
    const { brand_name, brand_website, user_id } = body;

    if (!brand_name || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if research exists in cache (within 7 days)
    const cached = await getCachedResearch(brand_name);
    if (cached) {
      console.log(`✅ Using cached research for ${brand_name}`);
      
      // Get creator profile for personalized pitch
      const creatorProfile = await getCreatorProfile(user_id);
      
      // Generate personalized pitch with cached research
      if (creatorProfile) {
        cached.generated_pitch = await generatePitchEmail(cached, creatorProfile);
      }
      
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      } as ResearchBrandResponse);
    }

    // Perform fresh research
    console.log(`🔍 Starting fresh research for ${brand_name}`);
    
    // Get creator profile first (needed for pitch strategy)
    const creatorProfile = await getCreatorProfile(user_id);
    if (!creatorProfile) {
      return NextResponse.json(
        { success: false, error: 'Creator profile not found' },
        { status: 404 }
      );
    }

    // Determine website URL
    let website = brand_website || null;
    if (!website) {
      // Try to find website from brand name
      website = await findBrandWebsite(brand_name);
    }

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Brand website required for research' },
        { status: 400 }
      );
    }

    // PHASE 1: Scrape company information
    const company_intel = await scrapeCompanyInfo(website);

    // PHASE 2: Find contact information
    const contact_info = await findContactInfo(website);

    // PHASE 3: Analyze creator program
    const creator_program = await analyzeCreatorProgram(website);

    // PHASE 4: Find recent campaigns
    const recent_campaigns = await findRecentCampaigns(brand_name);

    // PHASE 5: Generate pitch strategy
    const partialResearch: Partial<BrandResearch> = {
      brand_name,
      company_intel,
      contact_info,
      creator_program,
      recent_campaigns,
    };

    const pitch_strategy = await generatePitchStrategy(
      partialResearch,
      creatorProfile
    );

    // Assemble complete research
    const research: BrandResearch = {
      brand_name,
      researched_at: new Date().toISOString(),
      company_intel,
      contact_info,
      creator_program,
      recent_campaigns,
      pitch_strategy,
    };

    // PHASE 6: Generate personalized pitch email
    research.generated_pitch = await generatePitchEmail(research, creatorProfile);

    // Cache research for 7 days
    await cacheResearch(brand_name, research);

    console.log(`✅ Research complete for ${brand_name}`);

    return NextResponse.json({
      success: true,
      data: research,
      cached: false,
    } as ResearchBrandResponse);

  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Research failed',
      } as ResearchBrandResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCachedResearch(
  brandName: string
): Promise<BrandResearch | null> {
  const normalized = normalizeBrandName(brandName);

  const { data, error } = await supabase
    .from('brand_research')
    .select('research_data')
    .ilike('brand_name', normalized)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data.research_data as BrandResearch;
}

async function cacheResearch(
  brandName: string,
  research: BrandResearch
): Promise<void> {
  const normalized = normalizeBrandName(brandName);

  await supabase.from('brand_research').upsert(
    {
      brand_name: normalized,
      brand_website: research.company_intel.website,
      research_data: research,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    },
    {
      onConflict: 'brand_name',
    }
  );
}

async function getCreatorProfile(userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Creator profile not found:', error);
    return null;
  }

  return data as CreatorProfile;
}

async function findBrandWebsite(brandName: string): Promise<string | null> {
  // Try common patterns
  const commonTLDs = ['com', 'co', 'io', 'net'];
  const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const tld of commonTLDs) {
    const url = `https://www.${cleanName}.${tld}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch {
      // Continue trying
    }
  }

  return null;
}
