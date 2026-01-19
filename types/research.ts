// types/research.ts
// TypeScript interfaces for Deal Research Agent

export interface BrandResearch {
  brand_name: string;
  researched_at: string;
  
  company_intel: CompanyIntel;
  contact_info: ContactInfo;
  creator_program: CreatorProgram;
  recent_campaigns: RecentCampaign[];
  pitch_strategy: PitchStrategy;
  generated_pitch?: string;
}

export interface CompanyIntel {
  website: string;
  industry: string;
  company_size?: string;        // "100-500 employees"
  estimated_revenue?: string;   // "$50M-$100M"
  recent_news: string[];
  growth_indicators?: string;   // "50% YoY growth"
}

export interface ContactInfo {
  partnerships_email?: string;
  creator_program_url?: string;
  application_process?: string;
  social_media: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  response_expectations?: string;  // "Usually responds in 48-72 hours"
}

export interface CreatorProgram {
  has_program: boolean;
  program_type?: string;         // "Open application" or "Invite only"
  requirements?: {
    min_followers?: number;
    content_type?: string[];
    niche?: string[];
  };
  deliverables?: string[];       // ["3 Instagram Reels", "5 Stories"]
  compensation?: {
    type: string;                // "Cash + Product" or "Commission based"
    estimated_range?: string;    // "$3,000-$8,000"
  };
  contract_terms?: string[];
}

export interface RecentCampaign {
  creator_handle: string;
  platform: string;              // "Instagram", "TikTok", "YouTube"
  follower_count?: number;
  content_type: string;          // "Reel", "Story", "Video"
  posted_date?: string;
  engagement?: number;
  estimated_payment?: string;
}

export interface PitchStrategy {
  fit_score: number;             // 0-100
  why_good_fit: string[];
  talking_points: string[];
  budget_estimate: string;
  recommended_deliverables: string[];
  best_contact_method: string;
  pitch_timing?: string;         // "Best to reach out Mon-Wed mornings"
  red_flags: string[];
  success_probability: number;   // 0-100
}

// Creator profile from database
export interface CreatorProfile {
  user_id: string;
  instagram_handle: string;
  followers_count: number;
  engagement_rate: number;
  niche: string;
  created_at: string;
  updated_at: string;
}

// API request/response types
export interface ResearchBrandRequest {
  brand_name: string;
  brand_website?: string;
  user_id: string;
}

export interface ResearchBrandResponse {
  success: boolean;
  data?: BrandResearch;
  error?: string;
  cached?: boolean;
}

// Research step progress (for UI loading states)
export interface ResearchProgress {
  step: 'scraping' | 'contact' | 'program' | 'campaigns' | 'strategy' | 'complete';
  message: string;
  progress: number; // 0-100
}
