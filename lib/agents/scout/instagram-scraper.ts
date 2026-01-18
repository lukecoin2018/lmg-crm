// lib/agents/scout/instagram-scraper.ts
import { ApifyClient } from 'apify-client';

/**
 * Instagram scraping types
 */
export interface InstagramCreator {
  username: string;
  fullName: string;
  followers: number;
  biography: string;
  isVerified: boolean;
  isPrivate: boolean;
}

export interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  isSponsored: boolean;
  sponsorshipIndicators: string[];
}

export interface BrandMention {
  username: string;
  source: 'tag' | 'mention' | 'caption';
  context: string;
  postUrl: string;
  creatorUsername: string;
  engagement: number;
}

export interface DiscoveredInstagramBrand {
  username: string;
  name: string;
  website?: string;
  biography: string;
  followers: number;
  isVerified: boolean;
  proofPosts: string[]; // URLs of sponsored posts
  worksWith: string[]; // Creator usernames
  mentionCount: number;
  totalEngagement: number;
}

export interface InstagramDiscoveryResult {
  success: boolean;
  brands: DiscoveredInstagramBrand[];
  creatorsScraped: number;
  postsAnalyzed: number;
  error?: string;
  cached?: boolean;
}

/**
 * Instagram Scraper - Discovers brands by analyzing similar creators' sponsored posts
 */
export class InstagramScraper {
  private client!: ApifyClient;
  private enabled: boolean;

  constructor() {
    const apiToken = process.env.APIFY_API_TOKEN;
    this.enabled = !!apiToken;
    
    if (this.enabled) {
      this.client = new ApifyClient({ token: apiToken });
      console.log('[Instagram Scraper] Initialized with Apify');
    } else {
      console.log('[Instagram Scraper] Disabled - no APIFY_API_TOKEN found');
    }
  }

  /**
   * Main method: Discover brands from Instagram by analyzing similar creators
   */
  async discoverBrands(
    niche: string,
    userFollowers?: number
  ): Promise<InstagramDiscoveryResult> {
    if (!this.enabled) {
      return {
        success: false,
        brands: [],
        creatorsScraped: 0,
        postsAnalyzed: 0,
        error: 'Instagram scraping disabled - no API token',
      };
    }

    try {
      console.log(`[Instagram Scraper] Starting discovery for niche: ${niche}`);

      // Step 1: Find similar creators
      const creators = await this.findSimilarCreators(niche, userFollowers);
      console.log(`[Instagram Scraper] Found ${creators.length} similar creators`);

      if (creators.length === 0) {
        return {
          success: true,
          brands: [],
          creatorsScraped: 0,
          postsAnalyzed: 0,
        };
      }

      // Step 2: Get posts from each creator
      const allPosts: { creator: string; posts: InstagramPost[] }[] = [];
      let totalPosts = 0;

      for (const creator of creators.slice(0, 10)) { // Limit to 10 creators for cost
        const posts = await this.getCreatorPosts(creator.username, 30);
        allPosts.push({ creator: creator.username, posts });
        totalPosts += posts.length;
        console.log(`[Instagram Scraper] Got ${posts.length} posts from @${creator.username}`);
      }

      // Step 3: Detect sponsored posts
      const sponsoredPosts: { creator: string; post: InstagramPost }[] = [];
      for (const { creator, posts } of allPosts) {
        const sponsored = this.detectSponsoredPosts(posts);
        sponsored.forEach(post => sponsoredPosts.push({ creator, post }));
      }
      console.log(`[Instagram Scraper] Found ${sponsoredPosts.length} sponsored posts`);

      // Step 4: Extract brands from sponsored posts
      const brandMentions = this.extractBrands(sponsoredPosts);
      console.log(`[Instagram Scraper] Extracted ${brandMentions.length} brand mentions`);

      // Step 5: Aggregate and enrich brands
      const brands = await this.aggregateAndEnrichBrands(brandMentions);
      console.log(`[Instagram Scraper] Enriched ${brands.length} unique brands`);

      return {
        success: true,
        brands,
        creatorsScraped: Math.min(creators.length, 10),
        postsAnalyzed: totalPosts,
      };
    } catch (error) {
      console.error('[Instagram Scraper] Discovery error:', error);
      return {
        success: false,
        brands: [],
        creatorsScraped: 0,
        postsAnalyzed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find similar creators using hashtag search
   */
  private async findSimilarCreators(
    niche: string,
    userFollowers?: number
  ): Promise<InstagramCreator[]> {
    try {
      // Generate niche-specific hashtags
      const hashtags = this.getNicheHashtags(niche);
      console.log(`[Instagram Scraper] Searching hashtags: ${hashtags.join(', ')}`);

      const creators: InstagramCreator[] = [];

      // Search each hashtag (limit to first 2 to save credits)
      for (const hashtag of hashtags.slice(0, 2)) {
        try {
          const run = await this.client.actor('apify/instagram-hashtag-scraper').call({
            hashtags: [hashtag],
            resultsLimit: 50, // Get top posts
          });

          const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

          // Extract unique creators from posts
          const uniqueCreators = new Map<string, any>();
          for (const item of items as any[]) {
            if (item.ownerUsername && !uniqueCreators.has(item.ownerUsername)) {
              uniqueCreators.set(item.ownerUsername, {
                username: item.ownerUsername,
                fullName: item.ownerFullName || item.ownerUsername,
                followers: 0, // Will enrich later if needed
                biography: '',
                isVerified: false,
                isPrivate: false,
              });
            }
          }

          creators.push(...Array.from(uniqueCreators.values()));
        } catch (error) {
          console.warn(`[Instagram Scraper] Failed to search hashtag ${hashtag}:`, error);
        }
      }

      // Filter to similar size creators if userFollowers provided
      let filtered = creators;
      if (userFollowers) {
        const minFollowers = userFollowers * 0.5;
        const maxFollowers = userFollowers * 2;
        // Note: We'd need to enrich with follower counts, but for MVP we'll skip filtering
        console.log(`[Instagram Scraper] Would filter ${minFollowers}-${maxFollowers} followers`);
      }

      return filtered.slice(0, 20); // Return top 20
    } catch (error) {
      console.error('[Instagram Scraper] Error finding creators:', error);
      return [];
    }
  }

  /**
   * Get recent posts from a creator
   */
  private async getCreatorPosts(
    username: string,
    limit: number = 30
  ): Promise<InstagramPost[]> {
    try {
      const run = await this.client.actor('apify/instagram-profile-scraper').call({
        usernames: [username],
        resultsLimit: limit,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      return (items as any[]).map(item => ({
        id: item.id,
        shortCode: item.shortCode || '',
        caption: item.caption || '',
        hashtags: item.hashtags || [],
        mentions: item.mentions || [],
        timestamp: item.timestamp,
        likesCount: item.likesCount || 0,
        commentsCount: item.commentsCount || 0,
        isSponsored: false, // Will be detected
        sponsorshipIndicators: [],
      }));
    } catch (error) {
      console.warn(`[Instagram Scraper] Failed to get posts from @${username}:`, error);
      return [];
    }
  }

  /**
   * Detect sponsored posts by looking for indicators
   */
  private detectSponsoredPosts(posts: InstagramPost[]): InstagramPost[] {
    const sponsorshipIndicators = [
      '#ad',
      '#sponsored',
      '#partner',
      '#collab',
      '#brandpartner',
      'paid partnership',
      'sponsored content',
      '#gifted',
      '@brand',
    ];

    return posts
      .map(post => {
        const caption = post.caption.toLowerCase();
        const indicators: string[] = [];

        for (const indicator of sponsorshipIndicators) {
          if (caption.includes(indicator.toLowerCase())) {
            indicators.push(indicator);
          }
        }

        if (indicators.length > 0) {
          return {
            ...post,
            isSponsored: true,
            sponsorshipIndicators: indicators,
          };
        }

        return post;
      })
      .filter(post => post.isSponsored);
  }

  /**
   * Extract brand mentions from sponsored posts
   */
  private extractBrands(
    sponsoredPosts: { creator: string; post: InstagramPost }[]
  ): BrandMention[] {
    const mentions: BrandMention[] = [];

    for (const { creator, post } of sponsoredPosts) {
      const engagement = post.likesCount + post.commentsCount;
      const postUrl = `https://instagram.com/p/${post.shortCode}`;

      // Extract from @mentions
      for (const mention of post.mentions) {
        if (this.likelyBrandAccount(mention)) {
          mentions.push({
            username: mention,
            source: 'mention',
            context: post.caption.substring(0, 100),
            postUrl,
            creatorUsername: creator,
            engagement,
          });
        }
      }

      // Extract from caption (look for brand patterns)
      const captionBrands = this.extractBrandsFromCaption(post.caption);
      for (const brand of captionBrands) {
        mentions.push({
          username: brand,
          source: 'caption',
          context: post.caption.substring(0, 100),
          postUrl,
          creatorUsername: creator,
          engagement,
        });
      }
    }

    return mentions;
  }

  /**
   * Aggregate brand mentions and enrich with profile data
   */
  private async aggregateAndEnrichBrands(
    mentions: BrandMention[]
  ): Promise<DiscoveredInstagramBrand[]> {
    // Group by brand username
    const brandMap = new Map<string, {
      mentions: BrandMention[];
      totalEngagement: number;
      creators: Set<string>;
      posts: Set<string>;
    }>();

    for (const mention of mentions) {
      const existing = brandMap.get(mention.username) || {
        mentions: [],
        totalEngagement: 0,
        creators: new Set<string>(),
        posts: new Set<string>(),
      };

      existing.mentions.push(mention);
      existing.totalEngagement += mention.engagement;
      existing.creators.add(mention.creatorUsername);
      existing.posts.add(mention.postUrl);

      brandMap.set(mention.username, existing);
    }

    // Filter to brands mentioned by multiple creators (more reliable)
    const reliableBrands = Array.from(brandMap.entries())
      .filter(([_, data]) => data.creators.size >= 2) // At least 2 creators
      .sort((a, b) => b[1].totalEngagement - a[1].totalEngagement)
      .slice(0, 20); // Top 20

    // Enrich with profile data
    const enrichedBrands: DiscoveredInstagramBrand[] = [];

    for (const [username, data] of reliableBrands) {
      try {
        const profile = await this.enrichBrandProfile(username);
        if (profile) {
          enrichedBrands.push({
            ...profile,
            proofPosts: Array.from(data.posts),
            worksWith: Array.from(data.creators),
            mentionCount: data.mentions.length,
            totalEngagement: data.totalEngagement,
          });
        }
      } catch (error) {
        console.warn(`[Instagram Scraper] Failed to enrich @${username}:`, error);
        // Add without enrichment
        enrichedBrands.push({
          username,
          name: username,
          biography: '',
          followers: 0,
          isVerified: false,
          proofPosts: Array.from(data.posts),
          worksWith: Array.from(data.creators),
          mentionCount: data.mentions.length,
          totalEngagement: data.totalEngagement,
        });
      }
    }

    return enrichedBrands;
  }

  /**
   * Enrich brand with profile information
   */
  private async enrichBrandProfile(
    username: string
  ): Promise<Omit<DiscoveredInstagramBrand, 'proofPosts' | 'worksWith' | 'mentionCount' | 'totalEngagement'> | null> {
    try {
      const run = await this.client.actor('apify/instagram-profile-scraper').call({
        usernames: [username],
        resultsLimit: 1,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      if (items.length === 0) return null;

      const profile = items[0] as any;
      
      return {
        username: profile.username,
        name: profile.fullName || profile.username,
        website: this.extractWebsite(profile.biography || ''),
        biography: profile.biography || '',
        followers: profile.followersCount || 0,
        isVerified: profile.verified || false,
      };
    } catch (error) {
      console.warn(`[Instagram Scraper] Failed to enrich profile @${username}:`, error);
      return null;
    }
  }

  /**
   * Helper: Check if account is likely a brand (not personal)
   */
  private likelyBrandAccount(username: string): boolean {
    const personalIndicators = /\d{4,}|_me|_official|personal/i;
    return !personalIndicators.test(username);
  }

  /**
   * Helper: Extract brand mentions from caption text
   */
  private extractBrandsFromCaption(caption: string): string[] {
    const mentions = caption.match(/@[\w.]+/g) || [];
    return mentions
      .map(m => m.replace('@', ''))
      .filter(m => this.likelyBrandAccount(m));
  }

  /**
   * Helper: Extract website from bio
   */
  private extractWebsite(bio: string): string | undefined {
    const urlMatch = bio.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return urlMatch[0].replace(/[,)]$/, ''); // Remove trailing punctuation
    }
    return undefined;
  }

  /**
   * Helper: Generate niche-specific hashtags
   */
  private getNicheHashtags(niche: string): string[] {
    const nicheMap: Record<string, string[]> = {
      fitness: ['fitnessinfluencer', 'fitnesscreator', 'gymlife', 'fitfam'],
      beauty: ['beautyinfluencer', 'beautycreator', 'makeuplife', 'beautyblogger'],
      tech: ['techinfluencer', 'techcreator', 'techreview', 'gadgets'],
      fashion: ['fashioninfluencer', 'fashionblogger', 'ootd', 'styleinspo'],
      food: ['foodblogger', 'foodinfluencer', 'foodie', 'foodcreator'],
      travel: ['travelinfluencer', 'travelblogger', 'wanderlust', 'travelgram'],
      lifestyle: ['lifestyleinfluencer', 'lifestyleblogger', 'dailylife'],
      gaming: ['gamingcreator', 'gamer', 'streamers', 'gaminglife'],
    };

    return nicheMap[niche.toLowerCase()] || [niche + 'creator', niche + 'influencer'];
  }
}
