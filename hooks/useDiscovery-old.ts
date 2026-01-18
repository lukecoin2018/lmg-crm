import { useState } from 'react';

interface SimilarCreator {
  username: string;
  fullName: string;
  followersCount: number;
  biography: string;
  similarityScore: number;
  reasoning: string;
  profileUrl: string;
}

interface BrandOpportunity {
  brand: string;
  postUrl: string;
  caption: string;
  engagement: number;
}

interface DiscoveryResult {
  similarCreators: SimilarCreator[];
  brandOpportunities: BrandOpportunity[];
  metadata: {
    processingTime: number;
    cached: boolean;
    timestamp: string;
  };
}

interface UseDiscoveryReturn {
  discover: (instagramHandle: string) => Promise<void>;
  discoverTikTok: (tiktokHandle: string) => Promise<void>; // NEW
  result: DiscoveryResult | null;
  loading: boolean;
  error: string | null;
  progress: {
    stage: 'idle' | 'discovery' | 'filtering' | 'scoring' | 'partnerships' | 'complete';
    message: string;
  };
}

/**
 * React hook for discovering similar creators and brand opportunities
 * 
 * Usage:
 * const { discover, discoverTikTok, result, loading, error, progress } = useDiscovery(userId);
 * 
 * // Trigger Instagram discovery
 * await discover('username');
 * 
 * // Trigger TikTok discovery
 * await discoverTikTok('username');
 * 
 * // Display results
 * if (result) {
 *   console.log(result.similarCreators);
 *   console.log(result.brandOpportunities);
 * }
 */
export function useDiscovery(userId: string): UseDiscoveryReturn {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    stage: 'idle' | 'discovery' | 'filtering' | 'scoring' | 'partnerships' | 'complete';
    message: string;
  }>({
    stage: 'idle',
    message: '',
  });

  const discover = async (instagramHandle: string) => {
    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Stage 1: Discovery
      setProgress({
        stage: 'discovery',
        message: 'Searching Instagram for similar creators...',
      });

      const response = await fetch('/api/scout/discover/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagramHandle,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Discovery failed');
      }

      // Simulate progress updates (since API is async, we can't get real-time updates)
      // In production, you could implement SSE or WebSocket for real-time progress
      
      setTimeout(() => {
        setProgress({
          stage: 'filtering',
          message: 'Filtering and analyzing candidates...',
        });
      }, 5000);

      setTimeout(() => {
        setProgress({
          stage: 'scoring',
          message: 'Scoring similarity with AI...',
        });
      }, 15000);

      setTimeout(() => {
        setProgress({
          stage: 'partnerships',
          message: 'Extracting brand partnerships...',
        });
      }, 25000);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Discovery failed');
      }

      setProgress({
        stage: 'complete',
        message: 'Discovery complete!',
      });

      setResult(data.data);
      setLoading(false);

    } catch (err: any) {
      console.error('Discovery error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
      setProgress({
        stage: 'idle',
        message: '',
      });
    }
  };

  // NEW: TikTok discovery function
  const discoverTikTok = async (tiktokHandle: string) => {
    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Stage 1: Discovery
      setProgress({
        stage: 'discovery',
        message: 'Searching TikTok for similar creators...',
      });

      const response = await fetch('/api/scout/discover/tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiktokHandle,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Discovery failed');
      }

      // Simulate progress updates
      setTimeout(() => {
        setProgress({
          stage: 'partnerships',
          message: 'Extracting brand partnerships...',
        });
      }, 10000);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Discovery failed');
      }

      setProgress({
        stage: 'complete',
        message: 'Discovery complete!',
      });

      setResult(data.data);
      setLoading(false);

    } catch (err: any) {
      console.error('TikTok Discovery error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
      setProgress({
        stage: 'idle',
        message: '',
      });
    }
  };

  return {
    discover,
    discoverTikTok, // NEW: Return TikTok function
    result,
    loading,
    error,
    progress,
  };
}

/**
 * Hook for checking if cached results exist
 */
export function useDiscoveryCache() {
  const checkCache = async (username: string): Promise<{
    cached: boolean;
    data?: DiscoveryResult;
  }> => {
    try {
      const response = await fetch(
        `/api/scout/discover/instagram?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        return { cached: false };
      }

      const data = await response.json();
      return {
        cached: data.cached,
        data: data.data,
      };
    } catch (error) {
      console.error('Cache check error:', error);
      return { cached: false };
    }
  };

  return { checkCache };
}
