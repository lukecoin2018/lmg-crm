// components/research/ResearchReport.tsx
'use client';

import { useState } from 'react';
import type { BrandResearch } from '@/types/research';

interface ResearchReportProps {
  research: BrandResearch;
}

type Tab = 'company' | 'contact' | 'program' | 'campaigns' | 'strategy';

export function ResearchReport({ research }: ResearchReportProps) {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [showPitchEmail, setShowPitchEmail] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'contact', label: 'Contact', icon: '📧' },
    { id: 'program', label: 'Program', icon: '🎨' },
    { id: 'campaigns', label: 'Campaigns', icon: '📊' },
    { id: 'strategy', label: 'Strategy', icon: '🎯' },
  ];

  const copyPitchEmail = () => {
    if (research.generated_pitch) {
      navigator.clipboard.writeText(research.generated_pitch);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#FFD700] text-white'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'company' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Company Intelligence
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <InfoCard label="Industry" value={research.company_intel.industry} />
              {research.company_intel.company_size && (
                <InfoCard label="Company Size" value={research.company_intel.company_size} />
              )}
              {research.company_intel.estimated_revenue && (
                <InfoCard
                  label="Estimated Revenue"
                  value={research.company_intel.estimated_revenue}
                />
              )}
              {research.company_intel.growth_indicators && (
                <InfoCard
                  label="Growth"
                  value={research.company_intel.growth_indicators}
                />
              )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
              <h4 className="font-semibold text-white mb-3">Recent News</h4>
              <ul className="space-y-2">
                {research.company_intel.recent_news.map((news, i) => (
                  <li key={i} className="text-zinc-300 flex items-start gap-2">
                    <span className="text-[#FFD700] mt-1">•</span>
                    <span>{news}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Contact Information
            </h3>

            <div className="space-y-4">
              {research.contact_info.partnerships_email && (
                <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                  <h4 className="font-semibold text-white mb-2">
                    Partnerships Email
                  </h4>
                  <a
                    href={`mailto:${research.contact_info.partnerships_email}`}
                    className="text-[#FFD700] hover:underline text-lg"
                  >
                    {research.contact_info.partnerships_email}
                  </a>
                </div>
              )}

              {research.contact_info.creator_program_url && (
                <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                  <h4 className="font-semibold text-white mb-2">
                    Creator Program
                  </h4>
                  <a
                    href={research.contact_info.creator_program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFD700] hover:underline"
                  >
                    {research.contact_info.creator_program_url}
                  </a>
                </div>
              )}

              {research.contact_info.application_process && (
                <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                  <h4 className="font-semibold text-white mb-2">
                    Application Process
                  </h4>
                  <p className="text-zinc-300">
                    {research.contact_info.application_process}
                  </p>
                </div>
              )}

              {(research.contact_info.social_media.instagram ||
                research.contact_info.social_media.tiktok ||
                research.contact_info.social_media.youtube) && (
                <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                  <h4 className="font-semibold text-white mb-3">Social Media</h4>
                  <div className="space-y-2">
                    {research.contact_info.social_media.instagram && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Instagram:</span>
                        <a
                          href={`https://instagram.com/${research.contact_info.social_media.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FFD700] hover:underline"
                        >
                          @{research.contact_info.social_media.instagram}
                        </a>
                      </div>
                    )}
                    {research.contact_info.social_media.tiktok && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">TikTok:</span>
                        <a
                          href={`https://tiktok.com/@${research.contact_info.social_media.tiktok}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FFD700] hover:underline"
                        >
                          @{research.contact_info.social_media.tiktok}
                        </a>
                      </div>
                    )}
                    {research.contact_info.social_media.youtube && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">YouTube:</span>
                        <a
                          href={`https://youtube.com/@${research.contact_info.social_media.youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FFD700] hover:underline"
                        >
                          @{research.contact_info.social_media.youtube}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {research.contact_info.response_expectations && (
                <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                  <h4 className="font-semibold text-white mb-2">
                    Response Expectations
                  </h4>
                  <p className="text-zinc-300">
                    {research.contact_info.response_expectations}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'program' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Creator Program Details
            </h3>

            {research.creator_program.has_program ? (
              <div className="space-y-4">
                {research.creator_program.program_type && (
                  <InfoCard
                    label="Program Type"
                    value={research.creator_program.program_type}
                  />
                )}

                {research.creator_program.requirements && (
                  <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-3">
                      Requirements
                    </h4>
                    <div className="space-y-2">
                      {research.creator_program.requirements.min_followers && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Min Followers:</span>
                          <span className="text-white">
                            {research.creator_program.requirements.min_followers.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {research.creator_program.requirements.content_type && (
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-400">Content Types:</span>
                          <span className="text-white">
                            {research.creator_program.requirements.content_type.join(
                              ', '
                            )}
                          </span>
                        </div>
                      )}
                      {research.creator_program.requirements.niche && (
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-400">Niches:</span>
                          <span className="text-white">
                            {research.creator_program.requirements.niche.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {research.creator_program.deliverables && (
                  <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-3">
                      Typical Deliverables
                    </h4>
                    <ul className="space-y-2">
                      {research.creator_program.deliverables.map((item, i) => (
                        <li
                          key={i}
                          className="text-zinc-300 flex items-center gap-2"
                        >
                          <span className="text-[#FFD700]">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {research.creator_program.compensation && (
                  <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-3">
                      Compensation
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Type:</span>
                        <span className="text-white">
                          {research.creator_program.compensation.type}
                        </span>
                      </div>
                      {research.creator_program.compensation.estimated_range && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Range:</span>
                          <span className="text-[#FFD700] font-semibold text-lg">
                            {research.creator_program.compensation.estimated_range}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {research.creator_program.contract_terms && (
                  <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-3">
                      Contract Terms
                    </h4>
                    <ul className="space-y-2">
                      {research.creator_program.contract_terms.map((term, i) => (
                        <li
                          key={i}
                          className="text-zinc-300 flex items-start gap-2"
                        >
                          <span className="text-[#FFD700] mt-1">•</span>
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 text-center">
                <p className="text-zinc-400">
                  No public creator program found. Contact directly via email or
                  social media.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Recent Campaigns ({research.recent_campaigns.length})
            </h3>

            {research.recent_campaigns.length > 0 ? (
              <div className="space-y-4">
                {research.recent_campaigns.map((campaign, i) => (
                  <div
                    key={i}
                    className="bg-zinc-800 rounded-lg p-6 border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">
                          {campaign.creator_handle}
                        </h4>
                        <p className="text-sm text-zinc-400">
                          {campaign.platform} • {campaign.content_type}
                        </p>
                      </div>
                      {campaign.estimated_payment && (
                        <div className="text-right">
                          <div className="text-[#FFD700] font-semibold">
                            {campaign.estimated_payment}
                          </div>
                          <div className="text-xs text-zinc-400">estimated</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {campaign.follower_count && (
                        <div>
                          <span className="text-zinc-400">Followers: </span>
                          <span className="text-white">
                            {campaign.follower_count.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {campaign.posted_date && (
                        <div>
                          <span className="text-zinc-400">Posted: </span>
                          <span className="text-white">{campaign.posted_date}</span>
                        </div>
                      )}
                      {campaign.engagement && (
                        <div>
                          <span className="text-zinc-400">Engagement: </span>
                          <span className="text-white">{campaign.engagement}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 text-center">
                <p className="text-zinc-400">
                  No recent campaigns found. They may be working with creators
                  privately.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Pitch Strategy</h3>

            {/* Fit Score */}
            <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Fit Score</h4>
                <div className="text-2xl font-bold text-[#FFD700]">
                  {research.pitch_strategy.fit_score}/100
                </div>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFD700]"
                  style={{ width: `${research.pitch_strategy.fit_score}%` }}
                />
              </div>
            </div>

            {/* Success Probability */}
            <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Success Probability</h4>
                <div className="text-2xl font-bold text-[#FFD700]">
                  {research.pitch_strategy.success_probability}%
                </div>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFD700]"
                  style={{
                    width: `${research.pitch_strategy.success_probability}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <InfoCard
                label="Budget Estimate"
                value={research.pitch_strategy.budget_estimate}
              />
              <InfoCard
                label="Best Contact Method"
                value={research.pitch_strategy.best_contact_method}
              />
            </div>

            {research.pitch_strategy.pitch_timing && (
              <InfoCard
                label="Pitch Timing"
                value={research.pitch_strategy.pitch_timing}
              />
            )}

            <div className="space-y-4 mt-4">
              <StrategySection
                title="Why Good Fit"
                items={research.pitch_strategy.why_good_fit}
                icon="✓"
              />
              <StrategySection
                title="Talking Points"
                items={research.pitch_strategy.talking_points}
                icon="•"
              />
              <StrategySection
                title="Recommended Deliverables"
                items={research.pitch_strategy.recommended_deliverables}
                icon="→"
              />
              {research.pitch_strategy.red_flags.length > 0 && (
                <StrategySection
                  title="Red Flags"
                  items={research.pitch_strategy.red_flags}
                  icon="⚠"
                  variant="warning"
                />
              )}
            </div>

            {/* Generate Pitch Button */}
            {research.generated_pitch && (
              <div className="mt-6">
                <button
                  onClick={() => setShowPitchEmail(!showPitchEmail)}
                  className="w-full px-6 py-3 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-semibold rounded-lg transition-colors"
                >
                  {showPitchEmail ? 'Hide' : 'View'} Generated Pitch Email
                </button>

                {showPitchEmail && (
                  <div className="mt-4 bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">Pitch Email</h4>
                      <button
                        onClick={copyPitchEmail}
                        className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded transition-colors"
                      >
                        {copiedPitch ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-sm">
                      {research.generated_pitch}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
      <div className="text-sm text-zinc-400 mb-1">{label}</div>
      <div className="text-white font-medium">{value}</div>
    </div>
  );
}

function StrategySection({
  title,
  items,
  icon,
  variant = 'default',
}: {
  title: string;
  items: string[];
  icon: string;
  variant?: 'default' | 'warning';
}) {
  return (
    <div
      className={`rounded-lg p-6 border ${
        variant === 'warning'
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-zinc-800 border-zinc-700'
      }`}
    >
      <h4
        className={`font-semibold mb-3 ${
          variant === 'warning' ? 'text-red-400' : 'text-white'
        }`}
      >
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 ${
              variant === 'warning' ? 'text-red-300' : 'text-zinc-300'
            }`}
          >
            <span className={variant === 'warning' ? 'text-red-400' : 'text-[#FFD700]'}>
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
