// app/api/test-firecrawl/route.ts
import { NextResponse } from 'next/server';
import {
  testFirecrawlConnection,
  scrapeBrandWebsite,
} from '@/lib/scraping/firecrawl';

export async function GET() {
  try {
    // Test 1: Basic connection
    console.log('Testing Firecrawl API connection...');
    const connectionTest = await testFirecrawlConnection();

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection test failed',
          details: connectionTest.error,
        },
        { status: 500 }
      );
    }

    // Test 2: Scrape a brand website
    console.log('Testing website scraping...');
    const scrapeTest = await scrapeBrandWebsite('https://nike.com');

    if (!scrapeTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scraping test failed',
          details: scrapeTest.error,
        },
        { status: 500 }
      );
    }

    // All tests passed
    return NextResponse.json({
      success: true,
      tests: {
        connection: connectionTest,
        scraping: {
          success: scrapeTest.success,
          title: scrapeTest.data?.title,
          descriptionLength: scrapeTest.data?.description?.length,
          contentPreview: scrapeTest.data?.content?.substring(0, 100),
        },
      },
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}