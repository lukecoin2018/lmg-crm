export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">LMG Creator Platform</h1>
        <p className="text-zinc-400 mb-8">Find brand partnerships and close deals</p>
        <div className="space-x-4">
          <a 
            href="/login" 
            className="px-6 py-3 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 inline-block font-semibold"
          >
            Login
          </a>
          <a 
            href="/signup" 
            className="px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 inline-block font-semibold"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
