export default function Spinner({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      role="status"
      aria-label="Carregando"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#1DB954"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="45 15"
      />
    </svg>
  );
}
