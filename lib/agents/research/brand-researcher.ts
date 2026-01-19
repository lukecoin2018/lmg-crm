// lib/agents/research/brand-researcher.ts
// Core research engine for Deal Research Agent

import Anthropic from '@anthropic-ai/sdk';
import type {
  BrandResearch,
  CompanyIntel,
  ContactInfo,
  CreatorProgram,
  RecentCampaign,
  PitchStrategy,
  CreatorProfile,
} from '@/types/research';
import {
  extractEmails,
  findPartnershipEmails,
  extractSocialHandles,
  estimatePayment,
  parseFollowerCount,
  isValidUrl,
  calculateSuccessProbability,
} from './utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// ============================================================================
// 1. SCRAPE COMPANY INFO
// ============================================================================

export async function scrapeCompanyInfo(
  website: string
): Promise<CompanyIntel> {
  console.log(`🔍 Scraping company info from ${website}`);
  
  if (!isValidUrl(website)) {
    throw new Error('Invalid website URL');
  }
  
  // Scrape main pages with Firecrawl
  const pagesToScrape = [
    website,
    `${website}/about`,
    `${website}/about-us`,
    `${website}/company`,
  ];
  
  const scrapedContent: string[] = [];
  
  for (const url of pagesToScrape) {
    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.markdown) {
          scrapedContent.push(data.data.markdown);
        }
      }
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
    }
  }
  
  if (scrapedContent.length === 0) {
    throw new Error('Failed to scrape website');
  }
  
  // Use Claude to analyze scraped content
  const analysis = await analyzeCompanyContent(scrapedContent.join('\n\n'));
  
  // Search for recent news
  const recentNews = await searchCompanyNews(website);
  
  return {
    website,
    industry: analysis.industry,
    company_size: analysis.company_size,
    estimated_revenue: analysis.estimated_revenue,
    recent_news: recentNews,
    growth_indicators: analysis.growth_indicators,
  };
}

async function analyzeCompanyContent(content: string): Promise<{
  industry: string;
  company_size?: string;
  estimated_revenue?: string;
  growth_indicators?: string;
}> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analyze this company website content and extract key information.

WEBSITE CONTENT:
${content.slice(0, 10000)}

Extract and respond in JSON format:
{
  "industry": "e.g., Fitness Apparel, Beauty Products, Technology",
  "company_size": "e.g., 100-500 employees (if mentioned)",
  "estimated_revenue": "e.g., $50M-$100M (if mentioned or can be estimated)",
  "growth_indicators": "e.g., 50% YoY growth, Recently raised Series B (if mentioned)"
}

If information is not found, omit that field. Be concise.`,
    }],
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  
  try {
    return JSON.parse(text);
  } catch {
    return { industry: 'Unknown' };
  }
}

async function searchCompanyNews(website: string): Promise<string[]> {
  const brandName = new URL(website).hostname.replace('www.', '').split('.')[0];
  
  // Use web search to find recent news
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [{
      type: 'web_search_20250305' as const,
      name: 'web_search',
    }],
    messages: [{
      role: 'user',
      content: `Search for recent news about ${brandName} company. Focus on: funding announcements, product launches, marketing campaigns, partnerships, or growth milestones. Return 3-5 recent news items from the past year.`,
    }],
  });
  
  // Extract news from Claude's response
  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n');
  
  // Parse news items (Claude will format them)
  const newsItems = text
    .split('\n')
    .filter(line => line.trim().length > 20)
    .slice(0, 5);
  
  return newsItems.length > 0 ? newsItems : ['No recent news found'];
}

// ============================================================================
// 2. FIND CONTACT INFO
// ============================================================================

export async function findContactInfo(website: string): Promise<ContactInfo> {
  console.log(`📧 Finding contact information for ${website}`);
  
  // Scrape contact/partnership pages
  const pagesToScrape = [
    `${website}/contact`,
    `${website}/creators`,
    `${website}/partnerships`,
    `${website}/collaborate`,
    `${website}/influencers`,
    `${website}/ambassadors`,
  ];
  
  const scrapedContent: string[] = [];
  let creatorProgramUrl: string | undefined;
  
  for (const url of pagesToScrape) {
    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.markdown) {
          scrapedContent.push(data.data.markdown);
          
          // If this is a creator/partnership page, save the URL
          if (url.includes('creator') || url.includes('partnership') || url.includes('ambassador')) {
            creatorProgramUrl = url;
          }
        }
      }
    } catch (error) {
      // Page might not exist, continue
    }
  }
  
  const allContent = scrapedContent.join('\n\n');
  
  // Extract emails
  const allEmails = extractEmails(allContent);
  const partnershipEmails = findPartnershipEmails(allEmails);
  
  // Extract social media handles
  const socialHandles = extractSocialHandles(allContent);
  
  // Use Claude to determine best contact method and response expectations
  const contactAnalysis = await analyzeContactInfo(allContent, partnershipEmails);
  
  return {
    partnerships_email: partnershipEmails[0] || allEmails[0],
    creator_program_url: creatorProgramUrl,
    application_process: contactAnalysis.application_process,
    social_media: {
      instagram: socialHandles.instagram,
      tiktok: socialHandles.tiktok,
      youtube: socialHandles.youtube,
    },
    response_expectations: contactAnalysis.response_expectations,
  };
}

async function analyzeContactInfo(
  content: string,
  emails: string[]
): Promise<{
  application_process?: string;
  response_expectations?: string;
}> {
  if (!content) {
    return {};
  }
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Analyze this contact/partnerships page content and extract:

CONTENT:
${content.slice(0, 5000)}

FOUND EMAILS:
${emails.join(', ') || 'None'}

Respond in JSON:
{
  "application_process": "e.g., Fill out online form, Email directly, DM on Instagram",
  "response_expectations": "e.g., Usually responds in 48-72 hours, Apply and wait for review"
}`,
    }],
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ============================================================================
// 3. ANALYZE CREATOR PROGRAM
// ============================================================================

export async function analyzeCreatorProgram(
  website: string
): Promise<CreatorProgram> {
  console.log(`🎨 Analyzing creator program for ${website}`);
  
  // Scrape creator/ambassador pages
  const pagesToScrape = [
    `${website}/creators`,
    `${website}/creator-program`,
    `${website}/ambassadors`,
    `${website}/brand-ambassadors`,
    `${website}/partnerships`,
    `${website}/influencer-program`,
  ];
  
  let programContent = '';
  
  for (const url of pagesToScrape) {
    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.markdown) {
          programContent += data.data.markdown + '\n\n';
        }
      }
    } catch (error) {
      // Continue to next page
    }
  }
  
  // If no program pages found, return minimal info
  if (!programContent) {
    return {
      has_program: false,
    };
  }
  
  // Use Claude to analyze program details
  const analysis = await analyzeProgramContent(programContent);
  
  return {
    has_program: true,
    ...analysis,
  };
}

async function analyzeProgramContent(content: string): Promise<Partial<CreatorProgram>> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Analyze this creator/ambassador program content and extract details.

CONTENT:
${content.slice(0, 10000)}

Respond in JSON format:
{
  "program_type": "Open application" or "Invite only",
  "requirements": {
    "min_followers": 10000,
    "content_type": ["Reels", "Stories"],
    "niche": ["Fitness", "Lifestyle"]
  },
  "deliverables": ["3 Instagram Reels", "5 Stories", "1 YouTube video"],
  "compensation": {
    "type": "Cash + Product" or "Commission based" or "Product only",
    "estimated_range": "$3,000-$8,000"
  },
  "contract_terms": ["30-day exclusivity", "Usage rights for 1 year"]
}

Only include fields that are clearly mentioned in the content.`,
    }],
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ============================================================================
// 4. FIND RECENT CAMPAIGNS
// ============================================================================

export async function findRecentCampaigns(
  brandName: string
): Promise<RecentCampaign[]> {
  console.log(`📊 Finding recent campaigns for ${brandName}`);
  
  // Use web search to find recent sponsored posts
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    tools: [{
      type: 'web_search_20250305' as const,
      name: 'web_search',
    }],
    messages: [{
      role: 'user',
      content: `Search for recent influencer marketing campaigns by ${brandName}.

Search queries to try:
1. "site:instagram.com @${brandName.toLowerCase()} #ad"
2. "${brandName} influencer partnership"
3. "${brandName} brand ambassador"
4. "${brandName} sponsored post"

Find 5-10 recent examples of creators who partnered with ${brandName}.
For each, try to identify:
- Creator's handle/username
- Platform (Instagram, TikTok, YouTube)
- Approximate follower count
- Content type (Reel, Post, Story, Video)
- When it was posted (if available)

Format your findings as a list with details about each partnership.`,
    }],
  });
  
  // Extract campaign info from Claude's response
  const campaigns = await parseCampaignsFromResponse(message, brandName);
  
  return campaigns;
}

async function parseCampaignsFromResponse(
  message: any,
  brandName: string
): Promise<RecentCampaign[]> {
  const text = message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');
  
  // Ask Claude to structure the campaign data
  const structureMessage = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Convert this campaign research into structured JSON.

RESEARCH:
${text}

Respond with ONLY a JSON array of campaigns:
[
  {
    "creator_handle": "@username",
    "platform": "Instagram" or "TikTok" or "YouTube",
    "follower_count": 50000,
    "content_type": "Reel" or "Post" or "Story" or "Video",
    "posted_date": "2024-01-15" or null,
    "engagement": 4.2 or null,
    "estimated_payment": "$2,000-$4,000" or null
  }
]

If you found no campaigns, return: []`,
    }],
  });
  
  const jsonText = structureMessage.content[0].type === 'text' 
    ? structureMessage.content[0].text 
    : '[]';
  
  try {
    const campaigns = JSON.parse(jsonText);
    
    // Add estimated payments if missing
    return campaigns.map((campaign: RecentCampaign) => {
      if (!campaign.estimated_payment && campaign.follower_count) {
        campaign.estimated_payment = estimatePayment(
          campaign.follower_count,
          campaign.platform,
          campaign.content_type
        );
      }
      return campaign;
    });
  } catch {
    return [];
  }
}

// ============================================================================
// 5. GENERATE PITCH STRATEGY
// ============================================================================

export async function generatePitchStrategy(
  research: Partial<BrandResearch>,
  creatorProfile: CreatorProfile
): Promise<PitchStrategy> {
  console.log(`🎯 Generating pitch strategy`);
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a brand partnership analyst helping a creator pitch to a brand.

BRAND RESEARCH:
${JSON.stringify(research, null, 2)}

CREATOR PROFILE:
- Platform: Instagram
- Handle: @${creatorProfile.instagram_handle}
- Followers: ${creatorProfile.followers_count.toLocaleString()}
- Engagement: ${creatorProfile.engagement_rate}%
- Niche: ${creatorProfile.niche}

TASK: Analyze the brand research and create a pitch strategy.

Provide:
1. **Fit Score (0-100)**: How good a fit is this brand for the creator?
2. **Why Good Fit**: 3-5 specific reasons this partnership makes sense
3. **Talking Points**: Key things to mention in the pitch email
4. **Budget Estimate**: What should the creator expect to be paid? (be specific: $X,XXX-$X,XXX)
5. **Recommended Deliverables**: What to offer (be specific: "3 Instagram Reels + 5 Stories")
6. **Best Contact Method**: Email, DM, or application form?
7. **Pitch Timing**: When/how to reach out
8. **Red Flags**: Things to avoid or be cautious about
9. **Success Probability (0-100)**: Realistic chance of getting the deal

Base your budget estimate on:
- Creator's follower count (${creatorProfile.followers_count.toLocaleString()})
- Platform rates: Instagram Reel (50k followers) = $2,000-$4,000 baseline
- Adjust for brand size, industry, and recent campaign budgets
- Niche: ${creatorProfile.niche} (fitness/beauty typically pays more)

Respond in JSON format:
{
  "fit_score": 85,
  "why_good_fit": ["Reason 1", "Reason 2", "Reason 3"],
  "talking_points": ["Point 1", "Point 2", "Point 3"],
  "budget_estimate": "$3,500-$6,000",
  "recommended_deliverables": ["3 Instagram Reels", "5 Instagram Stories", "Product unboxing video"],
  "best_contact_method": "Email partnerships@ directly",
  "pitch_timing": "Best to reach out Mon-Wed mornings, reference their recent campaign",
  "red_flags": ["Long approval process", "Strict content guidelines"],
  "success_probability": 75
}`,
    }],
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  
  try {
    return JSON.parse(text);
  } catch {
    // Fallback strategy
    return {
      fit_score: 50,
      why_good_fit: ['Brand aligns with creator niche'],
      talking_points: ['Highlight engagement rate', 'Show past successful partnerships'],
      budget_estimate: estimatePayment(
        creatorProfile.followers_count,
        'Instagram',
        'Reel'
      ),
      recommended_deliverables: ['3 Instagram Reels', '5 Stories'],
      best_contact_method: research.contact_info?.partnerships_email 
        ? 'Email' 
        : 'Contact form on website',
      red_flags: [],
      success_probability: 50,
    };
  }
}

// ============================================================================
// 6. GENERATE PITCH EMAIL
// ============================================================================

export async function generatePitchEmail(
  research: BrandResearch,
  creatorProfile: CreatorProfile
): Promise<string> {
  console.log(`✉️ Generating pitch email`);
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Write a professional pitch email for a creator to send to a brand.

BRAND: ${research.brand_name}
BRAND INFO: ${JSON.stringify(research.company_intel, null, 2)}
CONTACT: ${research.contact_info.partnerships_email || 'partnerships team'}

CREATOR:
- Handle: @${creatorProfile.instagram_handle}
- Followers: ${creatorProfile.followers_count.toLocaleString()}
- Engagement: ${creatorProfile.engagement_rate}%
- Niche: ${creatorProfile.niche}

PITCH STRATEGY:
${JSON.stringify(research.pitch_strategy, null, 2)}

Write a concise, professional pitch email (200-300 words) that:
1. Opens with a genuine compliment about their brand/recent campaign
2. Briefly introduces the creator and their audience
3. Explains why they're a good fit (reference 2-3 talking points)
4. Suggests specific deliverables (${research.pitch_strategy.recommended_deliverables.join(', ')})
5. Includes a clear call-to-action
6. Professional but friendly tone

Subject line should be: "Partnership Opportunity - @${creatorProfile.instagram_handle}"

Format as a ready-to-send email with subject and body.`,
    }],
  });
  
  return message.content[0].type === 'text' ? message.content[0].text : '';
}
