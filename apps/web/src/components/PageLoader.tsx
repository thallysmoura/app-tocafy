export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div
        className="page-loader-ring h-12 w-12 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent, #1DB954)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))',
        }}
        role="status"
        aria-label="Carregando"
      />
    </div>
  );
}
