import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#3A3A3A] via-zinc-900 to-black">
      <div className="max-w-3xl px-8 text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold tracking-tight text-[#FFD700] sm:text-8xl">
            LMG
          </h1>
          <p className="text-2xl font-light tracking-widest text-white sm:text-3xl">
            CREATOR HUB
          </p>
        </div>

        {/* Tagline */}
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Your Business Command Center
        </h2>
        <p className="mt-6 text-lg leading-8 text-zinc-300">
          Manage brand deals, contracts, and payments all in one place. 
          Built for creators who want to scale their business with confidence.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#FFD700] px-8 py-4 text-base font-semibold text-[#3A3A3A] shadow-lg hover:bg-[#FFE55C] transition-all transform hover:scale-105"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="text-base font-semibold leading-6 text-[#FF4D94] hover:text-[#FF7AB3] transition-colors"
          >
            Sign In <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-[#FFD700]/20 bg-[#3A3A3A]/50 p-6 backdrop-blur">
            <div className="text-[#FFD700] text-2xl font-bold mb-2">Deal Pipeline</div>
            <p className="text-sm text-zinc-300">Track every opportunity from lead to payment</p>
          </div>
          <div className="rounded-lg border border-[#FF4D94]/20 bg-[#3A3A3A]/50 p-6 backdrop-blur">
            <div className="text-[#FF4D94] text-2xl font-bold mb-2">Smart Contracts</div>
            <p className="text-sm text-zinc-300">Generate professional contracts in seconds</p>
          </div>
          <div className="rounded-lg border border-[#3AAFF4]/20 bg-[#3A3A3A]/50 p-6 backdrop-blur">
            <div className="text-[#3AAFF4] text-2xl font-bold mb-2">Payment Tracking</div>
            <p className="text-sm text-zinc-300">Never miss a payment deadline again</p>
          </div>
        </div>
      </div>
    </div>
  )
}