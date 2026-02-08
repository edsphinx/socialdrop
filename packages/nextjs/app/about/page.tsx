export default function AboutPage() {
  return (
    <div className="flex flex-col items-center min-h-screen p-6 text-white max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About SocialDrop</h1>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">What is SocialDrop?</h2>
        <p className="opacity-80">
          SocialDrop is free, open-source infrastructure for launching engagement-driven NFT airdrop campaigns on
          Farcaster. Instead of distributing tokens to anonymous wallets, creators reward real social engagement — and
          the NFTs evolve on-chain based on the holder&apos;s influence.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 opacity-80">
          <li>A creator launches a campaign linked to a Farcaster cast</li>
          <li>Users like the cast to become eligible</li>
          <li>Users claim a Level 1 NFT through the Mini-App</li>
          <li>Users post their own promotional cast and register it</li>
          <li>As the cast earns likes, the NFT evolves through levels on-chain</li>
          <li>A public leaderboard tracks the top competitors</li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">War of Influence</h2>
        <p className="opacity-80">
          The &quot;War of Influence&quot; is what makes SocialDrop different. After claiming an NFT, holders compete by
          promoting the campaign on Farcaster. Their NFT evolves at influence milestones: Level 2 at 10 likes, Level 3
          at 25 likes, and Level 4 at 50 likes. Each evolution is a permanent on-chain upgrade.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">Built as a Public Good</h2>
        <p className="opacity-80">
          SocialDrop is completely free to use. No fees for creators, no fees for participants. We believe the Base
          ecosystem needs free infrastructure for social engagement. More campaigns mean more users, more transactions,
          and a stronger ecosystem for everyone.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">Technology</h2>
        <ul className="list-disc list-inside space-y-1 opacity-80">
          <li>Smart contract deployed and verified on Base</li>
          <li>Next.js frontend with Farcaster Mini-App SDK</li>
          <li>Neynar API for Farcaster data verification</li>
          <li>Supabase/Postgres for campaign and score tracking</li>
          <li>Open source under MIT license</li>
        </ul>
      </section>

      <div className="flex gap-3 mt-4">
        <a
          href="https://sepolia.basescan.org/address/0xB246F4D44e02AA578E4CeF9Fca03987Ee23AD7F2"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          View Contract on Basescan
        </a>
        <a href="/analytics" className="btn btn-secondary btn-sm">
          Platform Metrics
        </a>
        <a
          href="https://github.com/edsphinx/socialdrop"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
