// lib/youtube/analyzer.ts - YouTube Brand Partnership Discovery
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Types
interface YouTubeChannel {
  channelId: string;
  channelHandle: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  description: string;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  channelHandle: string;
  channelSubscribers: number;
}

interface BrandMention {
  brand: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  channelHandle: string;
  channelSubscribers: number;
  viewCount: number;
  publishedAt: string;
  mentionType: 'sponsor' | 'affiliate' | 'discount_code' | 'url';
  discountCode?: string;
  sponsorUrl?: string;
  context: string; // The text around the mention
}

interface BrandOpportunity {
  brand: string;
  mentionCount: number;
  totalViews: number;
  averageChannelSize: number;
  recentMentions: number; // Last 30 days
  discountCodes: string[];
  sponsorUrl?: string; // Brand website URL
  videoExamples: Array<{
    videoId: string;
    title: string;
    url: string;
    views: number;
  }>;
}

interface ScoredCreator {
  channelHandle: string;
  channelName: string;
  subscriberCount: number;
  similarityScore: number;
  reasoning: string;
}

interface DiscoveryResult {
  similarCreators: ScoredCreator[];
  brandOpportunities: Array<{
    brand: string;
    matchScore?: number;
    reasoning?: string;
    mentionCount: number;
    totalViews: number;
    videoUrl: string;
    videoTitle: string;
  }>;
  metadata: {
    processingTime: number;
    cached: boolean;
  };
}

export class YouTubeSimilarityAnalyzer {
  private POSTS_PER_CREATOR = 10; // Videos to analyze per creator
  
  // Hardcoded creators by niche (just like Instagram/TikTok)
  private KNOWN_CREATORS: Record<string, string[]> = {
    fitness: [
      'athleanx', 'FitnessBlender', 'ChloeTing', 'PamelaReif',
      'MadFit', 'GrowWithJo', 'Blogilates', 'SydneyCummings',
      'HeatherRobertson', 'CarolineGirvan', 'JeffNippard', 'WillTennyson'
    ],
    beauty: [
      'jamescharles', 'NikkieTutorials', 'MannyMua733', 'PatrickStarrr',
      'jeffreestar', 'jaclynnhill', 'TatiBeauty', 'MichellePhan'
    ],
    tech: [
      'mkbhd', 'LinusTechTips', 'UnboxTherapy', 'MrWhoseTheBoss',
      'Dave2D', 'TechLinked', 'JerryRigEverything', 'iJustine'
    ],
    food: [
      'bingingwithbabish', 'joshuaweissman', 'adamragusea', 'NotAnotherCookingShow',
      'aragusea', 'SortedFood', 'ChefJohnFoodWishes', 'EmmymadeinJapan'
    ],
    travel: [
      'MarkWiens', 'DrewBinsky', 'LostLeBlanc', 'KaraAndNate',
      'VagabrothersTravelGuide', 'SamuelAndAudrey', 'TheInfographicsShow'
    ],
    gaming: [
      'PewDiePie', 'MrBeast', 'Markiplier', 'jacksepticeye',
      'Ninja', 'Tfue', 'Pokimane', 'Valkyrae'
    ]
  };

  /**
   * Main entry point - find similar creators and brand opportunities
   */
  async findSimilarCreators(
    userYouTubeHandle: string,
    userId: string
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting YouTube similarity search for @${userYouTubeHandle}`);

    try {
      // For testing: Use mixed niches instead of single niche
      console.log(`📊 Using mixed niches for testing (fitness + tech + beauty)`);
      
      // Get 4 creators from each niche for variety
      const mixedCreators = [
        ...this.KNOWN_CREATORS.fitness.slice(0, 4),
        ...this.KNOWN_CREATORS.tech.slice(0, 4),
        ...this.KNOWN_CREATORS.beauty.slice(0, 4),
      ];
      
      console.log(`📊 Selected ${mixedCreators.length} creators from multiple niches`);

      // Get fallback creators
      console.log('🔄 Using fallback creators (YouTube)...');
      
      // Get channel info for fallback creators
      const creators: YouTubeChannel[] = [];
      for (const handle of mixedCreators) {
        try {
          const channel = await this.getChannelInfo(handle);
          if (channel) {
            creators.push(channel);
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch @${handle}:`, error);
        }
      }
      
      console.log(`🎯 Stage 1: Found ${creators.length} creators`);

      if (creators.length === 0) {
        console.warn('⚠️ No creators found. Returning empty results.');
        return {
          similarCreators: [],
          brandOpportunities: [],
          metadata: {
            processingTime: Date.now() - startTime,
            cached: false,
          },
        };
      }

      // Convert to scored creators (all fallback, so give them all 85% score)
      const scoredCreators: ScoredCreator[] = creators.map(c => ({
        channelHandle: c.channelHandle,
        channelName: c.channelName,
        subscriberCount: c.subscriberCount,
        similarityScore: 85,
        reasoning: `Popular creator`,
      }));

      // Extract brand partnerships
      console.log(`💼 Extracting brand partnerships from ${scoredCreators.length} creators...`);
      const brandMentions = await this.extractBrandPartnerships(creators);
      
      // Aggregate brands
      const brandOpportunities = this.aggregateBrands(brandMentions);
      
      console.log(`💼 Found ${brandOpportunities.length} brand opportunities`);

      const result = {
        similarCreators: scoredCreators,
        brandOpportunities: brandOpportunities.map(b => ({
          brand: b.brand,
          mentionCount: b.mentionCount,
          totalViews: b.totalViews,
          videoUrl: b.videoExamples[0]?.url || '',
          videoTitle: b.videoExamples[0]?.title || '',
          sponsorUrl: b.sponsorUrl, // NEW: Brand website
          caption: `Mentioned in ${b.mentionCount} video${b.mentionCount > 1 ? 's' : ''} by ${b.averageChannelSize >= 1000000 ? (b.averageChannelSize / 1000000).toFixed(1) + 'M' : (b.averageChannelSize / 1000).toFixed(0) + 'K'} subscriber channels. ${b.discountCodes.length > 0 ? `Discount codes: ${b.discountCodes.slice(0, 2).join(', ')}` : ''}`,
          engagement: b.totalViews,
        })),
        metadata: {
          processingTime: Date.now() - startTime,
          cached: false,
        },
      };

      return result;
    } catch (error) {
      console.error('❌ Error in similarity detection:', error);
      throw new Error(`Failed to find similar creators: ${error}`);
    }
  }

  /**
   * Get channel information from handle
   */
  private async getChannelInfo(handle: string): Promise<YouTubeChannel | null> {
    try {
      const cleanHandle = handle.replace('@', '');
      
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        forHandle: cleanHandle,
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const channel = response.data.items[0];
      
      return {
        channelId: channel.id!,
        channelHandle: cleanHandle,
        channelName: channel.snippet?.title || '',
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        description: channel.snippet?.description || '',
      };
    } catch (error) {
      console.error(`Error fetching channel ${handle}:`, error);
      return null;
    }
  }

  /**
   * Get recent videos from a channel
   */
  private async getChannelVideos(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
    try {
      console.log(`📹 Getting ${this.POSTS_PER_CREATOR} videos from @${channel.channelHandle}...`);
      
      // Get video IDs
      const searchResponse = await youtube.search.list({
        part: ['id'],
        channelId: channel.channelId,
        order: 'date',
        type: ['video'],
        maxResults: this.POSTS_PER_CREATOR,
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return [];
      }

      const videoIds = searchResponse.data.items
        .map(item => item.id?.videoId)
        .filter(Boolean) as string[];

      // Get video details
      const detailsResponse = await youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: videoIds,
      });

      if (!detailsResponse.data.items) {
        return [];
      }

      return detailsResponse.data.items.map(video => ({
        videoId: video.id!,
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        publishedAt: video.snippet?.publishedAt || '',
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        channelHandle: channel.channelHandle,
        channelSubscribers: channel.subscriberCount,
      }));
    } catch (error) {
      console.error(`Error fetching videos for ${channel.channelHandle}:`, error);
      return [];
    }
  }

  /**
   * Extract brand partnerships from creators' videos
   */
  private async extractBrandPartnerships(creators: YouTubeChannel[]): Promise<BrandMention[]> {
    const allMentions: BrandMention[] = [];

    for (const creator of creators) {
      const videos = await this.getChannelVideos(creator);
      
      for (const video of videos) {
        const mentions = this.detectSponsorsInDescription(video);
        allMentions.push(...mentions);
      }
    }

    return allMentions;
  }

  /**
   * Detect sponsors in video description
   */
  private detectSponsorsInDescription(video: YouTubeVideo): BrandMention[] {
    const description = video.description.toLowerCase();
    const mentions: BrandMention[] = [];

    // Sponsor phrases
    const sponsorPatterns = [
      /sponsored by ([^.\n]+)/gi,
      /brought to you by ([^.\n]+)/gi,
      /thanks to ([^.\n]+) for sponsoring/gi,
      /([^.\n]+) is sponsoring/gi,
      /this video was sponsored by ([^.\n]+)/gi,
      /special thanks to ([^.\n]+)/gi,
    ];

    sponsorPatterns.forEach(pattern => {
      const matches = [...description.matchAll(pattern)];
      for (const match of matches) {
        const brandText = match[1].trim();
        const brand = this.extractBrandName(brandText);
        
        if (brand) {
          // Find URL near this mention (within 150 chars)
          const mentionIndex = match.index!;
          const contextStart = Math.max(0, mentionIndex - 50);
          const contextEnd = Math.min(description.length, mentionIndex + 150);
          const context = description.substring(contextStart, contextEnd);
          
          const sponsorUrl = this.findUrlNearMention(context, brand);
          
          mentions.push({
            brand,
            videoId: video.videoId,
            videoTitle: video.title,
            videoUrl: `https://youtube.com/watch?v=${video.videoId}`,
            channelHandle: video.channelHandle,
            channelSubscribers: video.channelSubscribers,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt,
            mentionType: 'sponsor',
            sponsorUrl,
            context: match[0],
          });
        }
      }
    });

    // Discount codes (strong indicator of sponsorship)
    const codePattern = /use code ([A-Z0-9]+)/gi;
    const codeMatches = [...description.matchAll(codePattern)];
    
    for (const match of codeMatches) {
      const discountCode = match[1];
      
      // Try to find brand near the code
      const contextStart = Math.max(0, match.index! - 150);
      const contextEnd = Math.min(description.length, match.index! + 100);
      const context = description.substring(contextStart, contextEnd);
      
      // Look for brand name in context
      const brand = this.extractBrandFromContext(context);
      
      if (brand) {
        const sponsorUrl = this.findUrlNearMention(context, brand);
        
        mentions.push({
          brand,
          videoId: video.videoId,
          videoTitle: video.title,
          videoUrl: `https://youtube.com/watch?v=${video.videoId}`,
          channelHandle: video.channelHandle,
          channelSubscribers: video.channelSubscribers,
          viewCount: video.viewCount,
          publishedAt: video.publishedAt,
          mentionType: 'discount_code',
          discountCode,
          sponsorUrl,
          context: match[0],
        });
      }
    }

    return mentions;
  }

  /**
   * Find URL near a brand mention
   */
  private findUrlNearMention(context: string, brandName: string): string | undefined {
    // Extract all URLs from context
    const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
    const urls = [...context.matchAll(urlPattern)];
    
    if (urls.length === 0) return undefined;
    
    // Filter out irrelevant URLs
    const relevantUrls = urls.filter(match => {
      const domain = match[1];
      return this.isRelevantSponsorDomain(domain);
    });
    
    if (relevantUrls.length === 0) return undefined;
    
    // If only one relevant URL, return it
    if (relevantUrls.length === 1) {
      return relevantUrls[0][0];
    }
    
    // Multiple URLs - find closest to brand name
    const brandIndex = context.toLowerCase().indexOf(brandName.toLowerCase());
    if (brandIndex === -1) {
      return relevantUrls[0][0]; // Return first if brand not found in context
    }
    
    let closestUrl = relevantUrls[0][0];
    let closestDistance = Math.abs(relevantUrls[0].index! - brandIndex);
    
    for (const urlMatch of relevantUrls) {
      const distance = Math.abs(urlMatch.index! - brandIndex);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestUrl = urlMatch[0];
      }
    }
    
    return closestUrl;
  }

  /**
   * Extract clean brand name from text
   */
  private extractBrandName(text: string): string | null {
    // Remove common words
    const cleaned = text
      .replace(/\b(the|a|an|for|and|or|but|in|on|at|to|from)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    if (cleaned.length < 2 || cleaned.length > 30) {
      return null;
    }

    // Capitalize
    const brandName = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Filter out bad brand names
    if (this.isInvalidBrand(brandName)) {
      return null;
    }

    return brandName;
  }

  /**
   * Check if brand name is invalid/generic
   */
  private isInvalidBrand(brand: string): boolean {
    const invalidPatterns = [
      /^Apps?\s/i,              // "Apps Apple", "App Store"
      /^Play\s/i,               // "Play Google"
      /^Store\s/i,              // "Store Chloeting", "Store Madfit"
      /\sStore$/i,              // "Madfit Store", "Chloe Store"
      /^Pmc\s/i,                // "Pmc Ncbi" (research sites)
      /^Pubmed\s/i,             // "Pubmed Ncbi" (research sites)
      /Ncbi/i,                  // Any NIH/research domain
      /Nlm\sNih/i,              // NIH domains
      /^Shop\s/i,               // "Shop Gymshark"
      /\sApp$/i,                // "Madfit App", "Nike App"
      /^Get\s/i,                // "Get Skillshare"
      /^Visit\s/i,              // "Visit Website"
      /^Click\s/i,              // "Click Here"
      /^Link\s/i,               // "Link Bio"
      /^Bio$/i,                 // Just "Bio"
      /^Com$/i,                 // Just "Com"
      /^Https?$/i,              // Just "Http" or "Https"
      /^Www$/i,                 // Just "Www"
    ];

    return invalidPatterns.some(pattern => pattern.test(brand));
  }

  /**
   * Extract brand from context around discount code
   */
  private extractBrandFromContext(context: string): string | null {
    // Common brand patterns before discount codes
    const patterns = [
      /visit ([a-z]+\.com)/i,
      /go to ([a-z]+\.com)/i,
      /check out ([a-z]+\.com)/i,
      /([a-z]+\.com)/i,
      /get ([a-z\s]+) at/i,
    ];

    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match) {
        const brand = match[1].replace('.com', '').trim();
        return this.extractBrandName(brand);
      }
    }

    return null;
  }

  /**
   * Check if domain is relevant sponsor (not social media)
   */
  private isRelevantSponsorDomain(domain: string): boolean {
    const excluded = [
      'youtube.com', 'youtu.be',
      'instagram.com', 'twitter.com', 'tiktok.com',
      'facebook.com', 'linkedin.com',
      'patreon.com', 'discord.gg',
      'apps.apple.com', 'play.google.com', // App stores
      'bit.ly', 'tinyurl.com', 'goo.gl', // URL shorteners
      'amazon.com', 'amzn.to', // Too generic
    ];

    return !excluded.some(ex => domain.includes(ex));
  }

  /**
   * Convert domain to brand name
   */
  private domainToBrand(domain: string): string {
    return domain
      .replace(/^www\./, '')
      .replace(/\.[a-z]{2,}$/, '')
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Aggregate brand mentions into opportunities
   */
  private aggregateBrands(mentions: BrandMention[]): BrandOpportunity[] {
    const brandMap = new Map<string, BrandMention[]>();

    // Group by brand
    for (const mention of mentions) {
      const existing = brandMap.get(mention.brand) || [];
      existing.push(mention);
      brandMap.set(mention.brand, existing);
    }

    // Convert to opportunities
    const opportunities: BrandOpportunity[] = [];

    for (const [brand, brandMentions] of brandMap.entries()) {
      const totalViews = brandMentions.reduce((sum, m) => sum + m.viewCount, 0);
      const avgChannelSize = brandMentions.reduce((sum, m) => sum + m.channelSubscribers, 0) / brandMentions.length;
      
      // Count recent mentions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMentions = brandMentions.filter(m => new Date(m.publishedAt) > thirtyDaysAgo).length;

      // Extract discount codes
      const discountCodes = brandMentions
        .filter(m => m.discountCode)
        .map(m => m.discountCode!)
        .filter((v, i, a) => a.indexOf(v) === i); // unique

      // Get sponsor URL (prefer from mentions with URLs)
      const sponsorUrl = brandMentions.find(m => m.sponsorUrl)?.sponsorUrl;

      // Get video examples (top 3 by views)
      const sortedVideos = [...brandMentions].sort((a, b) => b.viewCount - a.viewCount);
      const videoExamples = sortedVideos.slice(0, 3).map(m => ({
        videoId: m.videoId,
        title: m.videoTitle,
        url: m.videoUrl,
        views: m.viewCount,
      }));

      opportunities.push({
        brand,
        mentionCount: brandMentions.length,
        totalViews,
        averageChannelSize: Math.round(avgChannelSize),
        recentMentions,
        discountCodes,
        videoExamples,
        sponsorUrl, // NEW: Include brand website
      });
    }

    // Sort by mention count
    return opportunities.sort((a, b) => b.mentionCount - a.mentionCount);
  }
}
