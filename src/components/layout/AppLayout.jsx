import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <Navbar onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
      <div style={{ display: 'flex', flex: 1, position: 'relative', minWidth: 0 }}>
        <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main
          className="main-content"
          style={{
            flex: 1,
            padding: '1.75rem',
            overflowY: 'auto',
            maxWidth: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', minWidth: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 640px) {
          main {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
