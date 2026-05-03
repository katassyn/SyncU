import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ProfileDrawer } from './ProfileDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const showSidebar = pathname.startsWith('/week');

  return (
    <div className="min-h-screen bg-bg-base">
      <TopBar onProfileClick={() => setDrawerOpen(true)} />

      {showSidebar && <Sidebar />}

      <main className={['pt-[57px]', showSidebar ? 'pl-60' : ''].join(' ')}>
        {children}
      </main>

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
