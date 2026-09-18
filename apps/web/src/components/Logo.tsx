import { useId } from 'react';

export default function Logo({ size = 56 }: { size?: number }) {
  // IDs únicos por instância — o Safari/WebKit falha em resolver o gradiente
  // (deixa o preenchimento invisível) quando há vários <Logo/> na mesma
  // página (sidebar, header, splash) usando o mesmo id de <linearGradient>.
  const uid = useId().replace(/:/g, '');
  const brandGradientId = `tocafy-brand-green-${uid}`;
  const shineGradientId = `tocafy-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tocafy"
    >
      <defs>
        <linearGradient id={brandGradientId} x1="68" y1="62" x2="452" y2="462" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38EE83" />
          <stop offset="1" stopColor="#0BBE59" />
        </linearGradient>
        <linearGradient id={shineGradientId} x1="98" y1="76" x2="390" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.20" />
          <stop offset="0.58" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="56" y="46" width="400" height="400" rx="130" fill={`url(#${brandGradientId})`} />
      <rect x="56" y="46" width="400" height="400" rx="130" fill={`url(#${shineGradientId})`} />
      <rect
        x="59"
        y="49"
        width="394"
        height="394"
        rx="127"
        stroke="#FFFFFF"
        strokeOpacity="0.17"
        strokeWidth="6"
      />
      <rect x="134" y="190" width="34" height="112" rx="17" fill="white" fillOpacity="0.92" />
      <rect x="194" y="126" width="38" height="240" rx="19" fill="white" />
      <rect x="258" y="162" width="38" height="168" rx="19" fill="white" />
      <rect x="322" y="95" width="38" height="302" rx="19" fill="white" />
      <rect x="386" y="202" width="24" height="88" rx="12" fill="white" fillOpacity="0.72" />
    </svg>
  );
}
