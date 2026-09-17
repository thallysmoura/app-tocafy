/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // "canvas", não "base": Tailwind já tem uma chave nativa "base" na
        // escala de fontSize (text-base = 1rem). Nomear a cor "base" faz o
        // Tailwind gerar um "text-base" ambíguo — em telas ≥640px ele virava
        // "color: #121212" (a cor do fundo) em vez de tamanho de fonte,
        // sobrescrevendo qualquer text-white/text-accent e deixando o texto
        // invisível (mesma cor do fundo) só no desktop.
        canvas: '#121212',
        elevated: '#1A1A1E',
        elevatedhover: '#26262C',
        accent: '#1DB954',
        accenthover: '#22D667',
        muted: '#A3A3AE',
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
