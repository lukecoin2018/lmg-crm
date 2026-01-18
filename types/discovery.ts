/**
 * Type definitions for the Creator Similarity Detection System
 */

// ==================== Instagram Types ====================

export interface InstagramProfile {
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

export interface InstagramPost {
  shortcode: string;
  url: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  type: 'photo' | 'video' | 'carousel';
}

// ==================== Discovery Types ====================

export interface ScoredCreator extends InstagramProfile {
  similarityScore: number; // 0-100
  reasoning: string;
}

export interface BrandPartnership {
  brand: string;
  postUrl: string;
  caption: string;
  timestamp: string;
  engagementCount: number;
}

export interface DiscoveryResult {
  similarCreators: ScoredCreator[];
  brandOpportunities: BrandPartnership[];
  processingTime: number;
  cached: boolean;
}

// ==================== API Types ====================

export interface DiscoveryRequest {
  instagramHandle: string;
  userId: string;
}

export interface DiscoveryResponse {
  success: boolean;
  data?: {
    similarCreators: Array<{
      username: string;
      fullName: string;
      followersCount: number;
      biography: string;
      similarityScore: number;
      reasoning: string;
      profileUrl: string;
    }>;
    brandOpportunities: Array<{
      brand: string;
      postUrl: string;
      caption: string;
      engagement: number;
    }>;
    metadata: {
      processingTime: number;
      cached: boolean;
      timestamp: string;
    };
  };
  error?: string;
  details?: string;
}

// ==================== Database Types ====================

export interface SimilarityCacheRow {
  id: string;
  username: string;
  similar_creators: ScoredCreator[];
  brand_opportunities: BrandPartnership[];
  created_at: string;
  updated_at: string;
}

export interface DiscoveryLogRow {
  id: string;
  user_id: string;
  instagram_handle: string;
  creators_found: number;
  brands_found: number;
  processing_time: number;
  cached: boolean;
  created_at: string;
}

export interface CreatorProfileRow {
  id: string;
  username: string;
  full_name: string;
  biography: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  verified: boolean;
  is_business_account: boolean;
  engagement_rate: number;
  profile_url: string;
  niche: string;
  last_scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface BrandOpportunityRow {
  id: string;
  brand_name: string;
  creator_username: string;
  post_url: string;
  caption: string;
  engagement_count: number;
  posted_at: string;
  discovered_at: string;
  created_at: string;
}

export interface UserDiscoveryRow {
  id: string;
  user_id: string;
  creator_username: string;
  similarity_score: number;
  reasoning: string;
  discovered_at: string;
}

// ==================== Algorithm Stage Types ====================

export type DiscoveryStage = 
  | 'idle' 
  | 'discovery' 
  | 'filtering' 
  | 'scoring' 
  | 'partnerships' 
  | 'complete';

export interface StageProgress {
  stage: DiscoveryStage;
  message: string;
  percentage?: number;
}

// ==================== Scoring Types ====================

export interface CreatorScore {
  username: string;
  score: number; // 0-100
  reasoning: string;
}

export interface ScoringResponse {
  scores: CreatorScore[];
}

// ==================== Filter Types ====================

export interface FilterCriteria {
  minFollowers: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  excludeBrands: boolean;
  requireActive: boolean;
}

export interface FilterResult {
  passed: boolean;
  reasons: string[];
}

// ==================== Search Types ====================

export interface SearchQuery {
  query: string;
  type: 'hashtag' | 'bio' | 'username';
  limit: number;
}

export interface SearchResult {
  profiles: InstagramProfile[];
  query: string;
  resultsFound: number;
}

// ==================== Apify Types ====================

export interface ApifyActorInput {
  usernames?: string[];
  hashtags?: string[];
  resultsLimit: number;
}

export interface ApifyDatasetItem {
  username: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  isBusinessAccount?: boolean;
  engagement?: number;
  url?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  timestamp?: string;
  shortcode?: string;
}

// ==================== Claude Types ====================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

// ==================== Error Types ====================

export class DiscoveryError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type ErrorCode =
  | 'PROFILE_NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'API_KEY_INVALID'
  | 'SERVICE_UNAVAILABLE'
  | 'CACHE_ERROR'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

// ==================== Config Types ====================

export interface AnalyzerConfig {
  maxCandidates: number;
  filteredCount: number;
  finalCount: number;
  minFollowers: number;
  cacheDurationDays: number;
  batchSize: number;
}

export interface RateLimitConfig {
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  windowSize: number; // milliseconds
}

// ==================== Utility Types ====================

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T> = Promise<T>;

// Type guards
export function isScoredCreator(obj: any): obj is ScoredCreator {
  return (
    obj &&
    typeof obj.username === 'string' &&
    typeof obj.similarityScore === 'number' &&
    typeof obj.reasoning === 'string'
  );
}

export function isBrandPartnership(obj: any): obj is BrandPartnership {
  return (
    obj &&
    typeof obj.brand === 'string' &&
    typeof obj.postUrl === 'string'
  );
}

export function isDiscoveryError(error: any): error is DiscoveryError {
  return error instanceof DiscoveryError;
}
