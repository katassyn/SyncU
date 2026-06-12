import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { ProfileDrawer } from './ProfileDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const isAuthPage = ['/login', '/register', '/onboarding'].includes(pathname);

  return (
    <div className="min-h-screen bg-bg-base">
      {!isAuthPage && <TopBar onProfileClick={() => setDrawerOpen(true)} />}

      <main className={!isAuthPage ? 'pt-[57px]' : ''}>
        {children}
      </main>

      {!isAuthPage && (
        <ProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
