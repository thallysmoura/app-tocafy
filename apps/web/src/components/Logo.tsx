export default function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tocafy"
    >
      <defs>
        <linearGradient id="tocafy-logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1ED760" />
          <stop offset="100%" stopColor="#0E8F3E" />
        </linearGradient>
      </defs>
      {/* Squircle no espírito Material — cantos bem arredondados, flat, sem bordas */}
      <path
        d="M32 2C10 2 2 10 2 32s8 30 30 30 30-8 30-30S54 2 32 2Z"
        fill="url(#tocafy-logo-bg)"
      />
      {/* Equalizador de três barras — remete a áudio sem copiar ícone de terceiros */}
      <path
        d="M22 26v12M32 16v32M42 22v20"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
