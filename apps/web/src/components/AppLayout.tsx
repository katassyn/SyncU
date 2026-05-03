import { useState } from 'react';
import { TopBar } from './TopBar';
import { ProfileDrawer } from './ProfileDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base">
      <TopBar onProfileClick={() => setDrawerOpen(true)} />

      {/* offset for fixed topbar (~57px = py-4*2 + line-height) */}
      <main className="pt-[57px]">
        {children}
      </main>

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
