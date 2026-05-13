import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h2 className="text-6xl font-bold text-slate-800 mb-4">404</h2>
      <h3 className="text-2xl font-semibold mb-2">Resource Not Found</h3>
      <p className="text-slate-400 mb-8 max-w-md">
        The page or data you are looking for does not exist in the Guardian network. 
        The link may be broken or the resource has been removed.
      </p>
      <Link href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
        Return to Dashboard
      </Link>
    </div>
  );
}