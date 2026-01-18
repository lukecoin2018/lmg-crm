'use client';

import { useState } from 'react';
import { useDiscovery } from '@/hooks/useDiscovery-old';

export default function DiscoveryDemo({ userId }: { userId: string }) {
  const [instagramHandle, setInstagramHandle] = useState('');
  const { discover, result, loading, error, progress } = useDiscovery(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramHandle.trim()) return;
    await discover(instagramHandle);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Find Similar Creators</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Handle
            </label>
            <input
              id="instagram"
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !instagramHandle.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Discovering...' : 'Find Brand Opportunities'}
          </button>
        </form>
      </div>

      {/* Progress Indicator */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-semibold text-blue-900">{progress.message}</p>
              <p className="text-sm text-blue-700 mt-1">
                {progress.stage === 'discovery' && 'Stage 1 of 4: Discovery'}
                {progress.stage === 'filtering' && 'Stage 2 of 4: Filtering'}
                {progress.stage === 'scoring' && 'Stage 3 of 4: AI Scoring'}
                {progress.stage === 'partnerships' && 'Stage 4 of 4: Brand Partnerships'}
              </p>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-500"
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-900 font-semibold">Error</p>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p>
              Found {result.similarCreators.length} similar creators and{' '}
              {result.brandOpportunities.length} brand opportunities in{' '}
              {(result.metadata.processingTime / 1000).toFixed(1)}s
              {result.metadata.cached && ' (cached)'}
            </p>
          </div>

          {/* Similar Creators */}
          <div>
            <h3 className="text-xl font-bold mb-4">Similar Creators</h3>
            <div className="grid gap-4">
              {result.similarCreators.map((creator) => (
                <div key={creator.username} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <a
                          href={creator.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-blue-600 hover:underline"
                        >
                          @{creator.username}
                        </a>
                        <span className="text-sm text-gray-500">
                          {creator.fullName}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{creator.biography}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{creator.followersCount.toLocaleString()} followers</span>
                      </div>
                      <p className="mt-3 text-sm text-gray-700 italic">
                        {creator.reasoning}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <div className="text-3xl font-bold text-blue-600">
                        {creator.similarityScore}
                      </div>
                      <div className="text-xs text-gray-500">similarity</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Opportunities */}
          <div>
            <h3 className="text-xl font-bold mb-4">Brand Opportunities</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {result.brandOpportunities.map((opp, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {opp.brand}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {opp.engagement.toLocaleString()} engagements
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {opp.caption}
                  </p>
                  <a
                    href={opp.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View partnership →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
