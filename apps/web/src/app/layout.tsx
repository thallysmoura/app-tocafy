import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import SplashScreen from '@/components/SplashScreen';

// Gotham é a fonte usada pelo Spotify de verdade — arquivos fornecidos pelo
// usuário (licença própria), não redistribuídos por nós.
const gotham = localFont({
  src: [
    { path: '../../public/fonts/gotham/Gotham-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/gotham/Gotham-Book.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/gotham/Gotham-BookItalic.ttf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/gotham/Gotham-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/gotham/Gotham-MediumItalic.ttf', weight: '500', style: 'italic' },
    { path: '../../public/fonts/gotham/Gotham-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Tocafy — sua música, sempre por perto',
    template: '%s · Tocafy',
  },
  description: 'Sua biblioteca de música pessoal, sempre à mão.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tocafy',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  // App é sempre escuro, sem tema claro — sem isso o navegador pode assumir
  // esquema claro e "corrigir" texto sem cor explícita (ou extensões tipo
  // Dark Reader tentam re-colorir a página, deixando texto preto no fundo escuro).
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={gotham.variable}>
      <body className="font-sans">
        <SplashScreen />
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
