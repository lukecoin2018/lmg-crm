'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useDiscovery } from '@/hooks/useDiscovery'; // CHANGED: Use new hook
import type {
  DiscoverySource,
  InstagramOpportunity,
  WebOpportunity,
  TabState,
} from '@/lib/agents/scout/types';

export default function OpportunitiesPage() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Get current user dynamically
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setAuthLoading(false);
    }
    getCurrentUser();
  }, []);
  
  // Instagram + TikTok + YouTube similarity detection hook
  const { discover, discoverTikTok, discoverYouTube, result: instagramResult, loading: instagramLoading, error: instagramError, progress } = useDiscovery(userId || '');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [youtubeHandle, setYoutubeHandle] = useState(''); // NEW: YouTube handle state
  
  // Tab state
  const [activeTab, setActiveTab] = useState<DiscoverySource>('instagram');
  const [niche, setNiche] = useState('');
  
  // Results per source (for other tabs)
  const [results, setResults] = useState<TabState['results']>({
    instagram: [],
    web: [],
    tiktok: [],
    youtube: [],
  });
  
  // Loading per source
  const [loading, setLoading] = useState<TabState['loading']>({
    instagram: false,
    web: false,
    tiktok: false,
    youtube: false,
  });
  
  // Errors per source
  const [errors, setErrors] = useState<TabState['errors']>({
    instagram: null,
    web: null,
    tiktok: null,
    youtube: null,
  });
  
  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Handle Instagram similarity search
  const handleInstagramSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramHandle.trim() || !userId) return;
    
    const cleanHandle = instagramHandle.replace('@', '').trim();
    await discover(cleanHandle);
  };

  // Handle TikTok similarity search
  const handleTikTokSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokHandle.trim() || !userId) return;
    
    const cleanHandle = tiktokHandle.replace('@', '').trim();
    await discoverTikTok(cleanHandle);
  };

  // NEW: Handle YouTube similarity search
  const handleYouTubeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeHandle.trim() || !userId) return;
    
    const cleanHandle = youtubeHandle.replace('@', '').trim();
    await discoverYouTube(cleanHandle);
  };

  // Handle search for other tabs (web, etc)
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!niche.trim()) return;
    
    // Set loading for active tab
    setLoading(prev => ({ ...prev, [activeTab]: true }));
    setErrors(prev => ({ ...prev, [activeTab]: null }));
    
    try {
      const response = await fetch(`/api/scout/discover/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search failed');
      }
      
      if (data.comingSoon) {
        setErrors(prev => ({ ...prev, [activeTab]: data.message }));
      } else {
        setResults(prev => ({
          ...prev,
          [activeTab]: data.opportunities,
        }));
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [activeTab]: error instanceof Error ? error.message : 'Search failed',
      }));
    } finally {
      setLoading(prev => ({ ...prev, [activeTab]: false }));
    }
  };

  // Handle tab change
  const handleTabChange = (tab: DiscoverySource) => {
    setActiveTab(tab);
  };

  // Handle add to pipeline
  const handleAddToPipeline = (opp: any) => {
    const estimatedValue = opp.matchScore >= 90 ? 10000 : opp.matchScore >= 80 ? 5000 : 2500;
    
    router.push(
      '/dashboard?' +
      'add_deal=true&' +
      'brand=' + encodeURIComponent(opp.brandName || opp.brand) + '&' +
      'value=' + estimatedValue + '&' +
      'notes=' + encodeURIComponent('Match Score: ' + opp.matchScore + '% - ' + (opp.reasoning || opp.caption)?.substring(0, 200)) + '&' +
      'opportunity_id=' + encodeURIComponent(opp.id)
    );
  };

  // Toggle card expansion
  const toggleExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userId) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please Log In</h2>
          <p className="text-zinc-400 mb-6">You need to be logged in to use this feature.</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-[#FFD700] hover:bg-[#E5C600] text-zinc-900 font-semibold px-6 py-3 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const activeResults = results[activeTab];
  const isLoading = loading[activeTab];
  const error = errors[activeTab];

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Scout Agent</h1>
          <p className="text-zinc-400">Discover brand partnership opportunities powered by AI</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {([
            { id: 'instagram', label: 'Instagram', icon: '📸', badge: undefined },
            { id: 'tiktok', label: 'TikTok', icon: '🎵', badge: undefined },
            { id: 'web', label: 'Web', icon: '🌐', badge: undefined },
            { id: 'youtube', label: 'YouTube', icon: '📺', badge: undefined }, {/* CHANGED: Removed "Soon" badge */}
          ] as Array<{ id: DiscoverySource; label: string; icon: string; badge?: string }>).map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-6 py-3 font-medium rounded-t-lg transition-all relative
                ${activeTab === tab.id
                  ? 'bg-[#FFD700] text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.badge && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Instagram Tab */}
        {activeTab === 'instagram' && (
          <div>
            {/* Search Form */}
            <div className="bg-zinc-800 rounded-lg p-6 mb-6">
              <form onSubmit={handleInstagramSearch}>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your Instagram Handle
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      placeholder="kayla_itsines"
                      className="w-full pl-8 pr-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={instagramLoading || !instagramHandle.trim()}
                    className="px-8 py-3 bg-[#FFD700] hover:bg-[#E5C600] disabled:bg-zinc-600 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {instagramLoading ? 'Finding...' : 'Find Brand Opportunities'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  💡 Find brands by analyzing similar creators' partnerships (30-60s)
                </p>
              </form>

              {/* Progress Indicator */}
              {instagramLoading && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FFD700]"></div>
                    <div>
                      <p className="text-white font-medium">
                        {progress.stage === 'discovery' && 'Stage 1/4: Finding similar creators...'}
                        {progress.stage === 'filtering' && 'Stage 2/4: Filtering candidates...'}
                        {progress.stage === 'scoring' && 'Stage 3/4: AI scoring with Claude...'}
                        {progress.stage === 'partnerships' && 'Stage 4/4: Extracting brand opportunities...'}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">{progress.message}</p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#FFD700] h-full transition-all duration-500"
                      style={{
                        width:
                          progress.stage === 'discovery' ? '25%' :
                          progress.stage === 'filtering' ? '50%' :
                          progress.stage === 'scoring' ? '75%' :
                          progress.stage === 'partnerships' ? '90%' : '0%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {instagramError && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400">{instagramError}</p>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!instagramLoading && !instagramResult && !instagramError && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Discover Brand Opportunities
                </h3>
                <p className="text-zinc-400 mb-4">
                  Enter your Instagram handle to find brands that work with creators like you
                </p>
                <div className="flex justify-center gap-2 text-sm text-zinc-500">
                  <span>Try:</span>
                  <button 
                    onClick={() => setInstagramHandle('kayla_itsines')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @kayla_itsines
                  </button>
                  <span>•</span>
                  <button 
                    onClick={() => setInstagramHandle('cristiano')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @cristiano
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {instagramResult && instagramResult.brandOpportunities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    Found {instagramResult.brandOpportunities.length} Brand Opportunities
                  </h2>
                  <span className="text-sm text-zinc-400">
                    {instagramResult.metadata.cached ? '(Cached)' : `${(instagramResult.metadata.processingTime / 1000).toFixed(1)}s`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instagramResult.brandOpportunities.map((brand, index) => (
                    <div key={index} className="bg-zinc-800 rounded-lg p-6 hover:border-zinc-600 border border-zinc-700 transition-all">
                      {/* Brand Name & Score */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-white text-lg">{brand.brand}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                          Match
                        </span>
                      </div>

                      {/* Proof Badge */}
                      <div className="mb-3">
                        <span className="text-sm text-green-400">
                          ✅ Works with creators at your level
                        </span>
                      </div>

                      {/* Caption Preview */}
                      {brand.caption && (
                        <p className={
                          'text-sm text-zinc-400 mb-4 ' +
                          (expandedCards.has(brand.brand + index) ? '' : 'line-clamp-3')
                        }>
                          {brand.caption}
                        </p>
                      )}

                      {/* Engagement */}
                      {brand.engagement > 0 && (
                        <p className="text-xs text-zinc-500 mb-3">
                          {brand.engagement.toLocaleString()} engagements
                        </p>
                      )}

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpanded(brand.brand + index)}
                        className="text-[#FFD700] hover:text-[#E5C600] text-sm mb-4 underline"
                      >
                        {expandedCards.has(brand.brand + index) ? 'Show Less' : 'View Details'}
                      </button>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-zinc-700">
                        <a
                          href={brand.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                        >
                          View Post
                        </a>
                        <button
                          onClick={() => handleAddToPipeline({ 
                            brandName: brand.brand, 
                            matchScore: 85,
                            reasoning: brand.caption,
                            id: brand.brand + index
                          })}
                          className="flex-1 px-3 py-2 bg-[#FFD700] hover:bg-[#E5C600] text-zinc-900 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Add to Pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Similar Creators */}
                {instagramResult.similarCreators.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Similar Creators ({instagramResult.similarCreators.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {instagramResult.similarCreators.map((creator, index) => (
                        <div key={index} className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <a
                                href={creator.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-white hover:text-[#FFD700]"
                              >
                                @{creator.username}
                              </a>
                              <p className="text-sm text-zinc-400 mt-1">
                                {creator.followersCount.toLocaleString()} followers
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold ml-2">
                              {creator.similarityScore}%
                            </span>
                          </div>
                          {creator.reasoning && (
                            <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                              {creator.reasoning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {instagramResult && instagramResult.brandOpportunities.length === 0 && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-4xl mb-3">🤷</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No opportunities found
                </h3>
                <p className="text-zinc-400">
                  Try a different creator or check back later as we add more data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: TikTok Tab */}
        {activeTab === 'tiktok' && (
          <div>
            {/* Search Form */}
            <div className="bg-zinc-800 rounded-lg p-6 mb-6">
              <form onSubmit={handleTikTokSearch}>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your TikTok Handle
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                    <input
                      type="text"
                      value={tiktokHandle}
                      onChange={(e) => setTiktokHandle(e.target.value)}
                      placeholder="charlidamelio"
                      className="w-full pl-8 pr-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={instagramLoading || !tiktokHandle.trim()}
                    className="px-8 py-3 bg-[#FFD700] hover:bg-[#E5C600] disabled:bg-zinc-600 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {instagramLoading ? 'Finding...' : 'Find Brand Opportunities'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  💡 Find brands by analyzing similar TikTok creators' partnerships (30-60s)
                </p>
              </form>

              {/* Progress Indicator */}
              {instagramLoading && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FFD700]"></div>
                    <div>
                      <p className="text-white font-medium">
                        {progress.stage === 'discovery' && 'Finding similar TikTok creators...'}
                        {progress.stage === 'partnerships' && 'Extracting brand opportunities...'}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">{progress.message}</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#FFD700] h-full transition-all duration-500"
                      style={{
                        width: progress.stage === 'discovery' ? '50%' : progress.stage === 'partnerships' ? '90%' : '0%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {instagramError && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400">{instagramError}</p>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!instagramLoading && !instagramResult && !instagramError && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Discover TikTok Brand Opportunities
                </h3>
                <p className="text-zinc-400 mb-4">
                  Enter your TikTok handle to find brands that work with creators like you
                </p>
                <div className="flex justify-center gap-2 text-sm text-zinc-500">
                  <span>Try:</span>
                  <button 
                    onClick={() => setTiktokHandle('charlidamelio')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @charlidamelio
                  </button>
                  <span>•</span>
                  <button 
                    onClick={() => setTiktokHandle('mikayla')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @mikayla
                  </button>
                </div>
              </div>
            )}

            {/* Results - Same as Instagram */}
            {instagramResult && instagramResult.brandOpportunities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    Found {instagramResult.brandOpportunities.length} Brand Opportunities
                  </h2>
                  <span className="text-sm text-zinc-400">
                    {instagramResult.metadata.cached ? '(Cached)' : `${(instagramResult.metadata.processingTime / 1000).toFixed(1)}s`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instagramResult.brandOpportunities.map((brand, index) => (
                    <div key={index} className="bg-zinc-800 rounded-lg p-6 hover:border-zinc-600 border border-zinc-700 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-white text-lg">{brand.brand}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                          Match
                        </span>
                      </div>

                      <div className="mb-3">
                        <span className="text-sm text-green-400">
                          ✅ Works with TikTok creators at your level
                        </span>
                      </div>

                      {brand.caption && (
                        <p className={'text-sm text-zinc-400 mb-4 ' + (expandedCards.has(brand.brand + index) ? '' : 'line-clamp-3')}>
                          {brand.caption}
                        </p>
                      )}

                      {brand.engagement > 0 && (
                        <p className="text-xs text-zinc-500 mb-3">
                          {brand.engagement.toLocaleString()} engagements
                        </p>
                      )}

                      <button
                        onClick={() => toggleExpanded(brand.brand + index)}
                        className="text-[#FFD700] hover:text-[#E5C600] text-sm mb-4 underline"
                      >
                        {expandedCards.has(brand.brand + index) ? 'Show Less' : 'View Details'}
                      </button>

                      <div className="flex gap-2 pt-4 border-t border-zinc-700">
                        <a
                          href={brand.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                        >
                          View Video
                        </a>
                        <button
                          onClick={() => handleAddToPipeline({ 
                            brandName: brand.brand, 
                            matchScore: 85,
                            reasoning: brand.caption,
                            id: brand.brand + index
                          })}
                          className="flex-1 px-3 py-2 bg-[#FFD700] hover:bg-[#E5C600] text-zinc-900 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Add to Pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {instagramResult && instagramResult.brandOpportunities.length === 0 && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-4xl mb-3">🤷</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No opportunities found
                </h3>
                <p className="text-zinc-400">
                  Try a different creator or check back later as we add more data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: YouTube Tab */}
        {activeTab === 'youtube' && (
          <div>
            {/* Search Form */}
            <div className="bg-zinc-800 rounded-lg p-6 mb-6">
              <form onSubmit={handleYouTubeSearch}>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your YouTube Channel Handle
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                    <input
                      type="text"
                      value={youtubeHandle}
                      onChange={(e) => setYoutubeHandle(e.target.value)}
                      placeholder="mkbhd"
                      className="w-full pl-8 pr-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={instagramLoading || !youtubeHandle.trim()}
                    className="px-8 py-3 bg-[#FFD700] hover:bg-[#E5C600] disabled:bg-zinc-600 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {instagramLoading ? 'Finding...' : 'Find Brand Opportunities'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  💡 Find brands by analyzing YouTube sponsorships (30-60s)
                </p>
              </form>

              {/* Progress Indicator */}
              {instagramLoading && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FFD700]"></div>
                    <div>
                      <p className="text-white font-medium">
                        {progress.stage === 'discovery' && 'Finding YouTube creators with sponsorships...'}
                        {progress.stage === 'partnerships' && 'Extracting brand opportunities...'}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">{progress.message}</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#FFD700] h-full transition-all duration-500"
                      style={{
                        width: progress.stage === 'discovery' ? '50%' : progress.stage === 'partnerships' ? '90%' : '0%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {instagramError && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400">{instagramError}</p>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!instagramLoading && !instagramResult && !instagramError && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Discover YouTube Brand Opportunities
                </h3>
                <p className="text-zinc-400 mb-4">
                  Enter your YouTube handle to find brands sponsoring creators like you
                </p>
                <div className="flex justify-center gap-2 text-sm text-zinc-500">
                  <span>Try:</span>
                  <button 
                    onClick={() => setYoutubeHandle('mkbhd')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @mkbhd
                  </button>
                  <span>•</span>
                  <button 
                    onClick={() => setYoutubeHandle('athleanx')}
                    className="text-[#FFD700] hover:underline"
                  >
                    @athleanx
                  </button>
                </div>
              </div>
            )}

            {/* Results - Same as Instagram/TikTok */}
            {instagramResult && instagramResult.brandOpportunities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    Found {instagramResult.brandOpportunities.length} Brand Opportunities
                  </h2>
                  <span className="text-sm text-zinc-400">
                    {instagramResult.metadata.cached ? '(Cached)' : `${(instagramResult.metadata.processingTime / 1000).toFixed(1)}s`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instagramResult.brandOpportunities.map((brand, index) => (
                    <div key={index} className="bg-zinc-800 rounded-lg p-6 hover:border-zinc-600 border border-zinc-700 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-white text-lg">{brand.brand}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                          Sponsor
                        </span>
                      </div>

                      <div className="mb-3">
                        <span className="text-sm text-green-400">
                          ✅ Sponsors YouTube creators at your level
                        </span>
                      </div>

                      {brand.caption && (
                        <p className={'text-sm text-zinc-400 mb-4 ' + (expandedCards.has(brand.brand + index) ? '' : 'line-clamp-3')}>
                          {brand.caption}
                        </p>
                      )}

                      {brand.engagement > 0 && (
                        <p className="text-xs text-zinc-500 mb-3">
                          {brand.engagement.toLocaleString()} views
                        </p>
                      )}

                      <button
                        onClick={() => toggleExpanded(brand.brand + index)}
                        className="text-[#FFD700] hover:text-[#E5C600] text-sm mb-4 underline"
                      >
                        {expandedCards.has(brand.brand + index) ? 'Show Less' : 'View Details'}
                      </button>

                      <div className="flex gap-2 pt-4 border-t border-zinc-700">
                        {(brand as any).sponsorUrl ? (
                          <>
                            <a
                              href={(brand as any).sponsorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-3 py-2 bg-[#FFD700] hover:bg-[#E5C600] text-zinc-900 text-sm font-semibold rounded-lg transition-colors text-center"
                            >
                              Visit Website
                            </a>
                            <a
                              href={brand.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                            >
                              View Video
                            </a>
                          </>
                        ) : (
                          <a
                            href={brand.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                          >
                            View Video
                          </a>
                        )}
                        <button
                          onClick={() => handleAddToPipeline({ 
                            brandName: brand.brand, 
                            matchScore: 85,
                            reasoning: brand.caption,
                            id: brand.brand + index
                          })}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          Add to Pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {instagramResult && instagramResult.brandOpportunities.length === 0 && (
              <div className="bg-zinc-800 rounded-lg p-12 text-center">
                <div className="text-4xl mb-3">🤷</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No opportunities found
                </h3>
                <p className="text-zinc-400">
                  Try a different creator or check back later as we add more data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* OTHER TABS */}
        {activeTab !== 'instagram' && activeTab !== 'tiktok' && activeTab !== 'youtube' && (
          <>
            <div className="bg-zinc-800 rounded-lg p-12 text-center">
              <p className="text-zinc-400">Other tabs work as before...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
