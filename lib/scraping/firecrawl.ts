// lib/scraping/firecrawl.ts
import Firecrawl from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

/**
 * Test function - Verify Firecrawl API works
 */
export async function testFirecrawlConnection(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const scrapeResponse: any = await firecrawl.scrape('https://example.com', {
      formats: ['markdown'],
    });

    // Log the actual response to see what we're getting
    console.log('Firecrawl response:', JSON.stringify(scrapeResponse, null, 2));

    if (scrapeResponse) {
      return {
        success: true,
        message: 'Firecrawl API is working! Response: ' + JSON.stringify(scrapeResponse).substring(0, 200),
      };
    } else {
      return {
        success: false,
        message: 'Firecrawl returned unsuccessful result',
        error: 'No data returned',
      };
    }
  } catch (error) {
    console.error('Firecrawl API Error:', error);
    return {
      success: false,
      message: 'Failed to connect to Firecrawl API',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrape a single brand website to extract company info
 */
export async function scrapeBrandWebsite(url: string): Promise<{
  success: boolean;
  data?: {
    url: string;
    title?: string;
    description?: string;
    content: string;
  };
  error?: string;
}> {
  try {
    const scrapeResponse: any = await firecrawl.scrape(url, {
      formats: ['markdown'],
    });

    console.log('Scrape response for', url, ':', scrapeResponse);

    if (!scrapeResponse) {
      return {
        success: false,
        error: 'Failed to scrape website - no response',
      };
    }

    const title = scrapeResponse.metadata?.title || '';
    const description = scrapeResponse.metadata?.description || '';
    const content = scrapeResponse.markdown || scrapeResponse.content || '';

    return {
      success: true,
      data: {
        url,
        title,
        description,
        content: content.substring(0, 2000),
      },
    };
  } catch (error) {
    console.error('Scraping Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for brands in a specific niche
 */
export async function searchBrandsInNiche(niche: string): Promise<{
  success: boolean;
  brands?: Array<{
    name: string;
    website: string;
    description: string;
  }>;
  error?: string;
}> {
  try {
    return {
      success: false,
      error: 'Search feature requires crawling - will implement in full Scout Agent',
    };
  } catch (error) {
    console.error('Search Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Advanced: Crawl and discover brands
 */
export async function discoverBrandsForNiche(params: {
  niche: string;
  targetCount?: number;
}): Promise<{
  success: boolean;
  brands?: Array<{
    name: string;
    website: string;
    description: string;
    sourceQuery: string;
  }>;
  error?: string;
}> {
  const { niche } = params;

  try {
    const crawlResponse: any = await firecrawl.crawl(`https://www.google.com/search?q=${encodeURIComponent(niche + ' brands')}`, {
      limit: 10,
      scrapeOptions: {
        formats: ['markdown'],
      },
    });

    if (!crawlResponse || !crawlResponse.success) {
      return {
        success: false,
        error: 'Failed to crawl for brands',
      };
    }

    const brands = (crawlResponse.data || []).map((page: any) => ({
      name: extractBrandName(page.metadata?.title || page.url),
      website: page.url,
      description: page.metadata?.description || 'No description available',
      sourceQuery: niche,
    }));

    return {
      success: true,
      brands,
    };
  } catch (error) {
    console.error('Brand Discovery Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Extract brand name from title or URL
 */
function extractBrandName(input: string): string {
  const cleaned = input
    .replace(/\s*-\s*.*$/, '')
    .replace(/\s*\|.*$/, '')
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/\.com.*$/, '')
    .trim();

  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .substring(0, 50);
}