// components/research/ResearchModal.tsx
'use client';

import { useState, useEffect } from 'react';
import type { BrandResearch } from '@/types/research';
import { ResearchReport } from './ResearchReport';

interface ResearchModalProps {
  brandName: string;
  brandWebsite?: string;
  userId: string;
  dealId?: string;
  onClose: () => void;
}

type LoadingStep = 
  | 'scraping' 
  | 'contact' 
  | 'program' 
  | 'campaigns' 
  | 'strategy' 
  | 'complete';

const LOADING_STEPS: Record<LoadingStep, { message: string; progress: number }> = {
  scraping: { message: 'Scraping website...', progress: 20 },
  contact: { message: 'Finding contact information...', progress: 40 },
  program: { message: 'Analyzing creator program...', progress: 55 },
  campaigns: { message: 'Finding recent campaigns...', progress: 70 },
  strategy: { message: 'Generating pitch strategy...', progress: 90 },
  complete: { message: 'Research complete!', progress: 100 },
};

export function ResearchModal({
  brandName,
  brandWebsite,
  userId,
  dealId,
  onClose,
}: ResearchModalProps) {
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('scraping');
  const [research, setResearch] = useState<BrandResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    performResearch();
  }, []);

  async function performResearch() {
    try {
      // Simulate loading steps
      const steps: LoadingStep[] = ['scraping', 'contact', 'program', 'campaigns', 'strategy'];
      
      // Start research request
      const response = fetch('/api/research/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName,
          brand_website: brandWebsite,
          user_id: userId,
        }),
      });

      // Show loading steps with delays
      for (const step of steps) {
        setLoadingStep(step);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s per step
      }

      // Get response
      const result = await response;
      const data = await result.json();

      if (!data.success) {
        throw new Error(data.error || 'Research failed');
      }

      setResearch(data.data);
      setCached(data.cached || false);
      setLoadingStep('complete');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg
                className="w-6 h-6 text-[#FFD700]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {brandName} Research
            </h2>
            {cached && (
              <p className="text-sm text-zinc-400 mt-1">
                Using cached research from last 7 days
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            // Error state
            <div className="p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
                <svg
                  className="w-12 h-12 text-red-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Research Failed
                </h3>
                <p className="text-zinc-400">{error}</p>
                <button
                  onClick={performResearch}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : research ? (
            // Success - show research report
            <ResearchReport research={research} />
          ) : (
            // Loading state
            <div className="p-6">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-zinc-700 border-t-[#FFD700] mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Researching {brandName}...
                  </h3>
                  <p className="text-zinc-400">
                    This will take 30-60 seconds
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>{LOADING_STEPS[loadingStep].message}</span>
                    <span>{LOADING_STEPS[loadingStep].progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FFD700] transition-all duration-500"
                      style={{ width: `${LOADING_STEPS[loadingStep].progress}%` }}
                    />
                  </div>
                </div>

                {/* Loading steps checklist */}
                <div className="space-y-3">
                  {(Object.keys(LOADING_STEPS) as LoadingStep[])
                    .filter(step => step !== 'complete')
                    .map((step) => {
                      const isActive = step === loadingStep;
                      const isComplete =
                        LOADING_STEPS[step].progress < LOADING_STEPS[loadingStep].progress;

                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isActive
                              ? 'bg-zinc-800/50 border-[#FFD700]/30'
                              : isComplete
                              ? 'bg-zinc-800/30 border-zinc-700/50'
                              : 'bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          {isComplete ? (
                            <svg
                              className="w-5 h-5 text-[#FFD700]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : isActive ? (
                            <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-zinc-700 rounded-full" />
                          )}
                          <span
                            className={
                              isActive || isComplete
                                ? 'text-white'
                                : 'text-zinc-500'
                            }
                          >
                            {LOADING_STEPS[step].message}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={onClose}
                  className="w-full mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
