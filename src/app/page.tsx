import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with canvas
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Q-Learn™</h1>
        <p className="text-blue-200">Loading quality systems...</p>
      </div>
    </div>
  ),
});

const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <GameCanvas />
      <InstallPrompt />
    </>
  );
}
