import Anthropic from '@anthropic-ai/sdk';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const apify = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  isBusinessAccount: boolean;
  engagementRate?: number;
  url: string;
}

interface ScoredCreator extends InstagramProfile {
  similarityScore: number;
  reasoning: string;
}

interface BrandPartnership {
  brand: string;
  postUrl: string;
  caption: string;
  timestamp: string;
  engagementCount: number;
}

interface DiscoveryResult {
  similarCreators: ScoredCreator[];
  brandOpportunities: BrandPartnership[];
  processingTime: number;
  cached: boolean;
}

// Hardcoded fallback creators by niche
const KNOWN_CREATORS: Record<string, string[]> = {
  'fitness': [
    'kayla_itsines', 'whitneyysimmons', 'alexia_clark', 'massy.arias',
    'brittne_babe', 'sumeet_sahni', 'jenselter', 'anllela_sagra',
    'michelle_lewin', 'sommer_ray', 'bakharnabieva', 'niamhcoghlan_',
  ],
  'beauty': [
    'hudabeauty', 'nikkietutorials', 'jamescharles', 'jeffreestar',
    'jackieaina', 'patrickstarrr', 'bretmanrock', 'makeupbyjakejamie',
  ],
  'fashion': [
    'chiaraferragni', 'negin_mirsalehi', 'aimesong', 'songofstyle',
    'camilacoelho', 'weworewhat', 'sincerelyjules', 'blaireadiebee',
  ],
  'food': [
    'halfbakedharvest', 'minimalistbaker', 'thefeedfeed', 'foodnetwork',
    'bonappetitmag', 'tasty', 'buzzfeedtasty', 'delish',
  ],
  'travel': [
    'beautifuldestinations', 'earthpix', 'wonderful_places', 'passionpassport',
    'natgeotravel', 'lonelyplanet', 'travelchannel', 'wanderlust',
  ],
  'tech': [
    'mkbhd', 'ijustine', 'unboxtherapy', 'techcrunch',
    'theverge', 'cnet', 'wired', 'engadget',
  ],
};

/**
 * Main class for finding similar creators using FOLLOWING ANALYSIS
 */
export class CreatorSimilarityAnalyzer {
  private readonly CACHE_DURATION_DAYS = 7;
  private readonly FINAL_COUNT = 20; // Top 20 creators to analyze
  private readonly MIN_FOLLOWERS = 10000;
  private readonly POSTS_PER_CREATOR = 30; // Increased to 30 posts
  private readonly FOLLOWING_LIMIT = 500; // How many following to check

  /**
   * Main entry point: Find similar creators via following analysis
   */
  async findSimilarCreators(
    userInstagramHandle: string,
    userId: string
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting similarity search for @${userInstagramHandle}`);

    // Check cache first
    const cached = await this.checkCache(userInstagramHandle);
    if (cached) {
      console.log('✅ Returning cached results');
      return {
        ...cached,
        processingTime: Date.now() - startTime,
        cached: true,
      };
    }

    try {
      // Get user's profile to understand their niche
      const userProfile = await this.scrapeProfile(userInstagramHandle);
      const niche = await this.detectNiche(userProfile);
      
      console.log(`📊 Detected niche: ${niche}`);

      // STAGE 1: DISCOVERY
      let candidates: InstagramProfile[];
      let usingFallback = false;
      
      try {
        candidates = await this.discoverViaFollowing(userInstagramHandle, userProfile, niche);
        // Check if we got fallback creators (they'll have a marker)
        usingFallback = candidates.length > 0 && candidates.length <= 15; // Fallback typically returns ~12
      } catch (error) {
        console.log('🔄 Using fallback creators...');
        candidates = await this.getFallbackCreators(niche);
        usingFallback = true;
      }
      
      console.log(`🎯 Stage 1: Discovered ${candidates.length} ${usingFallback ? 'fallback' : 'similar'} creators`);

      if (candidates.length === 0) {
        console.warn('⚠️ No candidates found. Returning empty results.');
        return {
          similarCreators: [],
          brandOpportunities: [],
          processingTime: Date.now() - startTime,
          cached: false,
        };
      }

      let finalCreators: ScoredCreator[];
      
      if (usingFallback) {
        // FALLBACK: Skip filtering and scoring, use all creators directly
        console.log(`✅ Using all ${candidates.length} fallback creators (no filtering/scoring needed)`);
        finalCreators = candidates.map(c => ({
          ...c,
          similarityScore: 85,
          reasoning: `${niche} creator`,
        }));
      } else {
        // NORMAL: Filter and score
        const topCreators = candidates.slice(0, this.FINAL_COUNT);
        console.log(`✂️ Stage 2: Selected top ${topCreators.length} creators`);
        
        finalCreators = await this.scoreCreators(topCreators, userProfile);
        console.log(`⭐ Stage 3: Scored and selected top ${finalCreators.length}`);
      }

      // STAGE 4: BRAND PARTNERSHIPS
      const partnerships = await this.extractBrandPartnerships(finalCreators);
      console.log(`💼 Stage 4: Found ${partnerships.length} brand opportunities`);

      const result = {
        similarCreators: finalCreators,
        brandOpportunities: partnerships,
        processingTime: Date.now() - startTime,
        cached: false,
      };

      // Cache the results
      await this.cacheResults(userInstagramHandle, result);

      return result;
    } catch (error) {
      console.error('❌ Error in similarity detection:', error);
      throw new Error(`Failed to find similar creators: ${error}`);
    }
  }

  /**
   * STAGE 1: DISCOVERY via Following Analysis (PRIMARY METHOD)
   */
  /**
   * STAGE 1: DISCOVERY via Related Profiles (Instagram's suggestions)
   */
  private async discoverViaFollowing(
    userHandle: string,
    userProfile: InstagramProfile,
    niche: string
  ): Promise<InstagramProfile[]> {
    try {
      console.log(`🔍 Finding Instagram's suggested similar accounts for @${userHandle}...`);
      
      // Use Instagram Related Person Scraper to get suggested similar accounts
      const run = await apify.actor('scrapio/instagram-related-person-scraper').call({
        username: userHandle,
        resultsLimit: 100, // Get up to 100 related accounts
      });

      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      console.log(`📊 Found ${items.length} related accounts from Instagram's suggestions`);

      if (!items || items.length === 0) {
        console.warn('⚠️ No related accounts found, using fallback');
        return this.getFallbackCreators(niche);
      }

      // Filter for creators with 10k+
      const maxFollowers = userProfile.followersCount * 5;
      const creators: InstagramProfile[] = [];
      
      for (const account of items) {
        const followers = (account.followersCount as number) || (account.follower_count as number) || 0;
        
        // Instagram's suggestions are already high quality, just check follower count
        if (
          followers >= this.MIN_FOLLOWERS &&
          followers <= maxFollowers &&
          !this.isBrandAccount(account)
        ) {
          creators.push(this.normalizeProfile(account));
          console.log(`✅ @${account.username}: ${followers.toLocaleString()} followers`);
        }
      }

      console.log(`✅ Found ${creators.length} creators with 10k+ followers from related profiles`);
      
      if (creators.length >= 10) {
        return creators.slice(0, 30); // Return top 30
      }

      console.warn('⚠️ Not enough creators from related profiles, using fallback');
      return this.getFallbackCreators(niche);

    } catch (error) {
      console.error('⚠️ Related profiles scraping failed:', error);
      console.log('🔄 Using fallback creators...');
      return this.getFallbackCreators(niche);
    }
  }

  /**
   * FALLBACK: Get hardcoded known creators for the niche
   */
  private async getFallbackCreators(niche: string): Promise<InstagramProfile[]> {
    console.log(`📚 Using fallback creators for ${niche} niche...`);
    
    // Get niche keyword (first word if multi-word)
    const nicheKey = niche.split(' ')[0].toLowerCase();
    const creatorHandles = KNOWN_CREATORS[nicheKey] || KNOWN_CREATORS['fitness']; // Default to fitness

    console.log(`Found ${creatorHandles.length} fallback creators`);

    // Fetch profiles for these creators
    const profiles: InstagramProfile[] = [];
    
    for (const handle of creatorHandles.slice(0, 20)) {
      try {
        const profile = await this.scrapeProfile(handle);
        if (profile.followersCount >= this.MIN_FOLLOWERS) {
          profiles.push(profile);
        }
      } catch (err) {
        console.warn(`Failed to fetch @${handle}`);
      }
    }

    return profiles;
  }

  /**
   * Check if account is a brand (not a creator)
   */
  private isBrandAccount(profile: any): boolean {
    const bio = ((profile.biography as string) || '').toLowerCase();
    const brandKeywords = ['official', 'shop', 'store', 'buy', '®', '©', 'tm'];
    return brandKeywords.some(keyword => bio.includes(keyword));
  }

  /**
   * STAGE 3: SCORING - Claude scores each creator
   */
  private async scoreCreators(
    candidates: InstagramProfile[],
    userProfile: InstagramProfile
  ): Promise<ScoredCreator[]> {
    console.log(`⭐ Scoring ${candidates.length} creators with Claude...`);

    // Score in batches
    const batchSize = 10;
    const scored: ScoredCreator[] = [];

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      try {
        const batchScores = await this.scoreBatch(batch, userProfile);
        scored.push(...batchScores);
      } catch (error) {
        console.warn('Scoring batch failed, using default scores');
        // Use default scores if Claude fails
        scored.push(...batch.map(c => ({
          ...c,
          similarityScore: 75,
          reasoning: 'Similar niche and audience',
        })));
      }
    }

    // Sort by score
    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored;
  }

  /**
   * Score a batch of creators using Claude
   */
  private async scoreBatch(
    batch: InstagramProfile[],
    userProfile: InstagramProfile
  ): Promise<ScoredCreator[]> {
    const prompt = this.buildScoringPrompt(batch, userProfile);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const response = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return this.parseScoringResponse(response, batch);
    } catch (error) {
      console.error('❌ Claude scoring error:', error);
      // Fallback: return with neutral scores
      return batch.map(profile => ({
        ...profile,
        similarityScore: 75,
        reasoning: 'Similar niche and audience',
      }));
    }
  }

  /**
   * Build Claude prompt for similarity scoring
   */
  private buildScoringPrompt(
    candidates: InstagramProfile[],
    userProfile: InstagramProfile
  ): string {
    return `You are a brand partnership expert analyzing creator similarity.

USER CREATOR:
- Username: @${userProfile.username}
- Name: ${userProfile.fullName}
- Bio: ${userProfile.biography}
- Followers: ${userProfile.followersCount.toLocaleString()}

TASK: Rate each candidate creator on a 0-100 scale answering:
"Would brands hiring @${userProfile.username} also want to hire this creator?"

CANDIDATES:
${candidates.map((c, i) => `
${i + 1}. @${c.username}
   Name: ${c.fullName}
   Bio: ${c.biography}
   Followers: ${c.followersCount.toLocaleString()}
`).join('\n')}

Respond ONLY with valid JSON:
{
  "scores": [
    {
      "username": "creator1",
      "score": 85,
      "reasoning": "Strong niche overlap, similar audience"
    }
  ]
}`;
  }

  /**
   * Parse Claude's scoring response
   */
  private parseScoringResponse(
    response: string,
    batch: InstagramProfile[]
  ): ScoredCreator[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonMatch[0]);
      
      return batch.map(profile => {
        const score = parsed.scores.find(
          (s: any) => s.username === profile.username
        );

        return {
          ...profile,
          similarityScore: score?.score || 75,
          reasoning: score?.reasoning || 'Similar niche and audience',
        };
      });
    } catch (error) {
      console.error('Failed to parse scoring response');
      return batch.map(profile => ({
        ...profile,
        similarityScore: 75,
        reasoning: 'Similar niche and audience',
      }));
    }
  }

  /**
   * STAGE 4: BRAND PARTNERSHIPS - Extract sponsored content
   */
  private async extractBrandPartnerships(
    creators: ScoredCreator[]
  ): Promise<BrandPartnership[]> {
    console.log(`💼 Extracting brand partnerships from ${creators.length} creators...`);
    console.log(`📊 Will analyze ${creators.length} × ${this.POSTS_PER_CREATOR} = ${creators.length * this.POSTS_PER_CREATOR} posts`);

    const allPartnerships: BrandPartnership[] = [];

    // Process 5 creators at a time (parallel batches)
    const batchSize = 5;
    for (let i = 0; i < creators.length; i += batchSize) {
      const batch = creators.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(creators.length / batchSize)}...`);
      
      const partnershipPromises = batch.map(creator =>
        this.getCreatorPartnerships(creator).catch(err => {
          console.warn(`Failed for @${creator.username}:`, err.message);
          return [];
        })
      );

      const results = await Promise.all(partnershipPromises);
      
      for (const partnerships of results) {
        allPartnerships.push(...partnerships);
      }
    }

    console.log(`✅ Found ${allPartnerships.length} total partnerships`);

    // Deduplicate by brand (keep highest engagement)
    const uniqueBrands = new Map<string, BrandPartnership>();
    for (const partnership of allPartnerships) {
      // Safety check: ensure brand is a string
      if (!partnership.brand || typeof partnership.brand !== 'string') {
        console.warn('Invalid brand in partnership:', partnership);
        continue;
      }
      
      const key = partnership.brand.toLowerCase();
      const existing = uniqueBrands.get(key);
      
      if (!existing || partnership.engagementCount > existing.engagementCount) {
        uniqueBrands.set(key, partnership);
      }
    }

    const final = Array.from(uniqueBrands.values());
    console.log(`🎯 Returning ${final.length} unique brands`);
    
    return final.slice(0, 25);
  }

  /**
   * Get brand partnerships from a creator's posts
   */
  private async getCreatorPartnerships(
    creator: ScoredCreator
  ): Promise<BrandPartnership[]> {
    try {
      console.log(`📸 Scraping ${this.POSTS_PER_CREATOR} posts from @${creator.username}...`);
      
      // Scrape posts using Apify
      const run = await apify.actor('apify/instagram-scraper').call({
        directUrls: [`https://www.instagram.com/${creator.username}/`],
        resultsType: 'posts',
        resultsLimit: this.POSTS_PER_CREATOR,
      });

      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      
      const partnerships: BrandPartnership[] = [];
      
      for (const post of items) {
        const caption = (post.caption as string) || '';
        const hashtags = (post.hashtags as string[]) || [];
        
        if (this.isSponsoredContent(caption, hashtags)) {
          const brand = this.extractBrandName(caption, post);
          if (brand) {
            partnerships.push({
              brand,
              postUrl: (post.url as string) || `https://instagram.com/p/${post.shortCode}`,
              caption: caption.substring(0, 200),
              timestamp: (post.timestamp as string) || new Date().toISOString(),
              engagementCount: ((post.likesCount as number) || 0) + ((post.commentsCount as number) || 0),
            });
          }
        }
      }

      return partnerships;
    } catch (error) {
      console.error(`Failed to extract partnerships for @${creator.username}:`, error);
      return [];
    }
  }

  /**
   * Detect sponsored content
   */
  private isSponsoredContent(caption: string, hashtags: string[] = []): boolean {
    const lowerCaption = caption.toLowerCase();
    
    // Check hashtags
    const sponsoredHashtags = ['ad', 'sponsored', 'partner', 'partnership', 'collab', 'ambassador'];
    for (const tag of hashtags) {
      if (sponsoredHashtags.some(st => tag.toLowerCase().includes(st))) {
        return true;
      }
    }
    
    // Check caption
    const indicators = [
      '#ad', '#sponsored', '#partner', 'paid partnership',
      'sponsored by', 'thanks to @', 'use code', 'promo code',
      'link in bio', 'ambassador',
    ];

    return indicators.some(indicator => lowerCaption.includes(indicator));
  }

  /**
   * Extract brand name from post
   */
  private extractBrandName(caption: string, post: any): string | null {
    // Method 1: @mentions
    const mentions = caption.match(/@(\w+)/g);
    if (mentions && mentions.length > 0) {
      return mentions[0].replace('@', '');
    }

    // Method 2: Tagged users
    if (post.taggedUsers && Array.isArray(post.taggedUsers) && post.taggedUsers.length > 0) {
      const taggedUser = post.taggedUsers[0];
      // Handle both string and object formats
      if (typeof taggedUser === 'string') {
        return taggedUser;
      } else if (taggedUser && typeof taggedUser === 'object' && taggedUser.username) {
        return taggedUser.username;
      }
    }

    // Method 3: Text patterns
    const patterns = [
      /thanks to ([\w\s]+)/i,
      /sponsored by ([\w\s]+)/i,
      /partnership with ([\w\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match && match[1]) {
        return match[1].trim().split(' ')[0];
      }
    }

    return null;
  }

  /**
   * Helper: Scrape Instagram profile
   */
  private async scrapeProfile(username: string): Promise<InstagramProfile> {
    const run = await apify.actor('apify/instagram-profile-scraper').call({
      usernames: [username],
    });

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      throw new Error(`Profile not found: @${username}`);
    }

    return this.normalizeProfile(items[0]);
  }

  /**
   * Normalize Apify data to profile format
   */
  private normalizeProfile(data: any): InstagramProfile {
    return {
      username: data.username || '',
      fullName: data.fullName || data.username || '',
      biography: data.biography || '',
      followersCount: data.followersCount || 0,
      followingCount: data.followsCount || data.followingCount || 0,
      postsCount: data.postsCount || 0,
      verified: data.verified || false,
      isBusinessAccount: data.isBusinessAccount || false,
      engagementRate: data.engagement || undefined,
      url: `https://instagram.com/${data.username || ''}`,
    };
  }

  /**
   * Detect niche from profile
   */
  private async detectNiche(profile: InstagramProfile): Promise<string> {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `What is the primary niche of this Instagram creator? Respond with 1-3 words only.

Username: @${profile.username}
Name: ${profile.fullName}
Bio: ${profile.biography}`,
        }],
      });

      const niche = message.content[0].type === 'text' 
        ? message.content[0].text.trim().toLowerCase()
        : 'lifestyle';

      return niche;
    } catch (error) {
      console.warn('Niche detection failed, using biography keywords');
      const keywords = this.extractKeywords(profile.biography);
      return keywords[0] || 'lifestyle';
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Check cache
   */
  private async checkCache(username: string): Promise<DiscoveryResult | null> {
    try {
      const { data, error } = await supabase
        .from('similarity_cache')
        .select('*')
        .eq('username', username)
        .gte('created_at', new Date(Date.now() - this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (error || !data) return null;

      return {
        similarCreators: data.similar_creators as ScoredCreator[],
        brandOpportunities: data.brand_opportunities as BrandPartnership[],
        processingTime: 0,
        cached: true,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache results
   */
  private async cacheResults(username: string, result: DiscoveryResult): Promise<void> {
    try {
      await supabase.from('similarity_cache').upsert({
        username,
        similar_creators: result.similarCreators,
        brand_opportunities: result.brandOpportunities,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to cache results:', error);
    }
  }
}
