// components/research/ResearchButton.tsx
'use client';

import { useState } from 'react';
import { ResearchModal } from './ResearchModal';

interface ResearchButtonProps {
  brandName: string;
  brandWebsite?: string;
  userId: string;
  dealId?: string;
}

export function ResearchButton({
  brandName,
  brandWebsite,
  userId,
  dealId,
}: ResearchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
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
        Research
      </button>

      {isModalOpen && (
        <ResearchModal
          brandName={brandName}
          brandWebsite={brandWebsite}
          userId={userId}
          dealId={dealId}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
