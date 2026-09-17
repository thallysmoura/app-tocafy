export default function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar por título, artista ou álbum"
      className="w-72 rounded-full bg-elevated px-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-spotify"
    />
  );
}
