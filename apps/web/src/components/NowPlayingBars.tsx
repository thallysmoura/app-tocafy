export default function NowPlayingBars({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-end gap-[2px]"
      style={{ height: size, width: size }}
      aria-label="Tocando agora"
    >
      <span className="now-playing-bar w-[3px] bg-accent" style={{ animationDelay: '0ms' }} />
      <span className="now-playing-bar w-[3px] bg-accent" style={{ animationDelay: '200ms' }} />
      <span className="now-playing-bar w-[3px] bg-accent" style={{ animationDelay: '400ms' }} />
    </span>
  );
}
