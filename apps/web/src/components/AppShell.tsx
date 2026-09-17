import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomTabBar from './BottomTabBar';
import PlayerBar from './PlayerBar';
import GlobalDownloadModal from './GlobalDownloadModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-base pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+3.5rem)] sm:pb-24 sm:pt-0">
        {children}
      </main>
      <BottomTabBar />
      <PlayerBar />
      <GlobalDownloadModal />
    </div>
  );
}
