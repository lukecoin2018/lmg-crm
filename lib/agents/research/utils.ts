// lib/agents/research/utils.ts
// Utility functions for brand research

/**
 * Extract emails from text using regex
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Find partnership-related emails from a list
 */
export function findPartnershipEmails(emails: string[]): string[] {
  const partnershipKeywords = [
    'partnerships',
    'collaborate',
    'collab',
    'creator',
    'influencer',
    'marketing',
    'brand',
    'ambassador',
    'pr',
  ];
  
  return emails.filter(email => 
    partnershipKeywords.some(keyword => 
      email.toLowerCase().includes(keyword)
    )
  );
}

/**
 * Extract social media handles from text
 */
export function extractSocialHandles(text: string): {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
} {
  const handles: { instagram?: string; tiktok?: string; youtube?: string } = {};
  
  // Instagram: @handle or instagram.com/handle
  const igMatch = text.match(/(?:@|instagram\.com\/)([a-zA-Z0-9._]+)/i);
  if (igMatch) handles.instagram = igMatch[1].replace(/^@/, '');
  
  // TikTok: @handle or tiktok.com/@handle
  const ttMatch = text.match(/(?:@|tiktok\.com\/@)([a-zA-Z0-9._]+)/i);
  if (ttMatch) handles.tiktok = ttMatch[1].replace(/^@/, '');
  
  // YouTube: youtube.com/c/handle or youtube.com/@handle
  const ytMatch = text.match(/youtube\.com\/(?:c\/|@)?([a-zA-Z0-9_-]+)/i);
  if (ytMatch) handles.youtube = ytMatch[1];
  
  return handles;
}

/**
 * Estimate payment based on follower count and platform
 */
export function estimatePayment(
  followers: number,
  platform: string,
  contentType: string
): string {
  let baseRate = 0;
  
  // Platform multipliers
  const platformMultiplier: Record<string, number> = {
    'Instagram': 1.0,
    'TikTok': 0.8,
    'YouTube': 2.0,
  };
  
  // Content type multipliers
  const contentMultiplier: Record<string, number> = {
    'Reel': 1.0,
    'Post': 0.7,
    'Story': 0.3,
    'Video': 1.5,
  };
  
  // Base rate calculation (rough industry standard)
  if (followers < 10000) {
    baseRate = followers * 0.05; // $0.05 per follower
  } else if (followers < 50000) {
    baseRate = followers * 0.04;
  } else if (followers < 100000) {
    baseRate = followers * 0.035;
  } else if (followers < 500000) {
    baseRate = followers * 0.03;
  } else {
    baseRate = followers * 0.02;
  }
  
  // Apply multipliers
  const platMult = platformMultiplier[platform] || 1.0;
  const contMult = contentMultiplier[contentType] || 1.0;
  
  const estimated = baseRate * platMult * contMult;
  const min = Math.round(estimated * 0.7);
  const max = Math.round(estimated * 1.3);
  
  return `$${min.toLocaleString()}-$${max.toLocaleString()}`;
}

/**
 * Parse follower count from text (handles "10K", "1.5M", etc.)
 */
export function parseFollowerCount(text: string): number | undefined {
  const match = text.match(/([\d.]+)\s*([KMB])/i);
  if (!match) return undefined;
  
  const number = parseFloat(match[1]);
  const multiplier = match[2].toUpperCase();
  
  const multipliers: Record<string, number> = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000,
  };
  
  return Math.round(number * (multipliers[multiplier] || 1));
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize brand name for cache lookup (lowercase, trim, remove special chars)
 */
export function normalizeBrandName(name: string): string {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

/**
 * Calculate success probability based on multiple factors
 */
export function calculateSuccessProbability(
  fitScore: number,
  hasSimilarPartnerships: boolean,
  creatorMeetsRequirements: boolean,
  hasActiveProgram: boolean
): number {
  let probability = fitScore;
  
  if (hasSimilarPartnerships) probability += 10;
  if (creatorMeetsRequirements) probability += 15;
  if (hasActiveProgram) probability += 10;
  
  return Math.min(100, Math.max(0, probability));
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
