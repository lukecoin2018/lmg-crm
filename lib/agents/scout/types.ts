// lib/agents/scout/types.ts - COMPLETE TYPES FOR TAB-BASED ARCHITECTURE

/**
 * Source types for different discovery methods
 */
export type DiscoverySource = 'instagram' | 'web' | 'tiktok' | 'youtube';

/**
 * Base opportunity interface (shared fields)
 */
interface BaseOpportunity {
  id: string;
  brandName: string;
  matchScore: number;
  reasoning: string;
  niche: string;
  createdAt: string;
}

/**
 * Instagram-specific opportunity with proof data
 */
export interface InstagramOpportunity extends BaseOpportunity {
  source: 'instagram';
  instagram: string; // @handle
  website?: string;
  instagramData: {
    followers: number;
    verified: boolean;
    partnerships: number; // Number of creators at similar level
    proofPosts: Array<{
      url: string;
      creator: string;
      date: string;
      likes: number;
      comments: number;
    }>;
    lastPartnership: string; // ISO date
    typicalContent: 'Reels' | 'Stories' | 'Posts' | 'Mixed';
    estimatedRate: {
      min: number;
      max: number;
    };
    worksWith: string[]; // Creator usernames
  };
}

/**
 * Web-specific opportunity from website scraping
 */
export interface WebOpportunity extends BaseOpportunity {
  source: 'web';
  website: string;
  webData: {
    hasCreatorProgram: boolean;
    contactEmail?: string;
    description: string;
    companySize?: 'Startup' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
    industry: string;
    tags: string[];
  };
}

/**
 * TikTok opportunity (future)
 */
export interface TikTokOpportunity extends BaseOpportunity {
  source: 'tiktok';
  tiktokHandle: string;
  website?: string;
  tiktokData: {
    followers: number;
    verified: boolean;
    avgViews: number;
    engagement: number;
    trends: string[];
  };
}

/**
 * YouTube opportunity (future)
 */
export interface YouTubeOpportunity extends BaseOpportunity {
  source: 'youtube';
  channelId: string;
  channelName: string;
  website?: string;
  youtubeData: {
    subscribers: number;
    verified: boolean;
    avgViews: number;
    sponsorships: number;
  };
}

/**
 * Union type for all opportunity types
 */
export type Opportunity =
  | InstagramOpportunity
  | WebOpportunity
  | TikTokOpportunity
  | YouTubeOpportunity;

/**
 * Discovery result for each source
 */
export interface DiscoveryResult<T extends Opportunity = Opportunity> {
  success: boolean;
  source: DiscoverySource;
  opportunities: T[];
  stats?: {
    itemsScraped: number; // Creators for IG, Websites for Web, etc.
    itemsAnalyzed: number; // Posts for IG, Pages for Web
    brandsDiscovered: number;
    processingTimeMs: number;
  };
  error?: string;
  comingSoon?: boolean; // For TikTok/YouTube stubs
}

/**
 * Search request payload
 */
export interface SearchRequest {
  niche: string;
  userFollowers?: number; // For Instagram similarity matching
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Tab state management
 */
export interface TabState {
  activeTab: DiscoverySource;
  results: {
    instagram: InstagramOpportunity[];
    web: WebOpportunity[];
    tiktok: TikTokOpportunity[];
    youtube: YouTubeOpportunity[];
  };
  loading: {
    instagram: boolean;
    web: boolean;
    tiktok: boolean;
    youtube: boolean;
  };
  errors: {
    instagram: string | null;
    web: string | null;
    tiktok: string | null;
    youtube: string | null;
  };
}

/**
 * Component props types
 */
export interface OpportunityCardProps<T extends Opportunity> {
  opportunity: T;
  onAddToPipeline: (opp: T) => void;
  onExpand?: (oppId: string) => void;
  expanded?: boolean;
}

export interface SourceTabsProps {
  activeTab: DiscoverySource;
  onTabChange: (tab: DiscoverySource) => void;
  resultCounts: {
    instagram: number;
    web: number;
    tiktok: number;
    youtube: number;
  };
}

export interface SearchBarProps {
  onSearch: (niche: string) => void;
  loading: boolean;
  initialValue?: string;
}