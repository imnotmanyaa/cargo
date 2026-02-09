import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { PublicTracking } from './components/PublicTracking';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { NewShipment } from './components/NewShipment';
import { ActiveShipments } from './components/ActiveShipments';
import { Transit } from './components/Transit';
import { Arrival } from './components/Arrival';
import { Reports } from './components/Reports';
import { WMS } from './components/WMS';
import { Settings } from './components/Settings';
import { CorporateClients } from './components/CorporateClients';
import { CorporateDashboard } from './components/CorporateDashboard';
import { IndividualDashboard } from './components/IndividualDashboard';
import { ReceiverDashboard } from './components/ReceiverDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('new-shipment');
  // На мобильных закрыты по умолчанию, на десктопе открыты (оба на lg - 1024px)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [individualPage, setIndividualPage] = useState<'dashboard' | 'new-shipment'>('dashboard');

  // Check for public tracking URL
  const [trackingId, setTrackingId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/tracking\/(.+)$/);
    if (match) {
      setTrackingId(match[1]);
    }
  }, []);

  if (trackingId) {
    return <PublicTracking shipmentId={trackingId} />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Admin Dashboard
  if (user?.role === 'admin') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-4 md:p-6">
              <AdminDashboard theme={theme} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Manager Dashboard
  if (user?.role === 'manager') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-4 md:p-6">
              <ManagerDashboard theme={theme} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Different dashboards for different roles
  if (user?.role === 'corporate') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-4 md:p-8">
              <CorporateDashboard theme={theme} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (user?.role === 'individual') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-4 md:p-8">
              {individualPage === 'dashboard' ? (
                <IndividualDashboard
                  theme={theme}
                  onCreateShipment={() => setIndividualPage('new-shipment')}
                />
              ) : (
                <NewShipment
                  theme={theme}
                  onBack={() => setIndividualPage('dashboard')}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (user?.role === 'receiver') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-4 md:p-8">
              <ReceiverDashboard theme={theme} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'new-shipment':
        return <NewShipment theme={theme} />;
      case 'active-shipments':
        return <ActiveShipments theme={theme} />;
      case 'transit':
        return <Transit theme={theme} />;
      case 'arrival':
        return <Arrival theme={theme} />;
      case 'reports':
        return <Reports theme={theme} />;
      case 'wms':
        return <WMS theme={theme} />;
      case 'settings':
        return <Settings theme={theme} />;
      case 'corporate':
        return <CorporateClients theme={theme} />;
      default:
        return <NewShipment />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
      />

      <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Backdrop для закрытия левого сайдбара на мобильных (невидимый) */}
        {leftSidebarOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ top: '64px' }}
            onClick={() => setLeftSidebarOpen(false)}
          />
        )}

        {/* Левый сайдбар - показываем только когда открыт ИЛИ на десктопе */}
        {leftSidebarOpen && (
          <div className="fixed lg:static z-40 lg:z-0 h-full">
            <LeftSidebar
              currentPage={currentPage}
              onNavigate={(page) => {
                setCurrentPage(page);
                // Закрываем сайдбар на мобильных после выбора
                if (window.innerWidth < 1024) {
                  setLeftSidebarOpen(false);
                }
              }}
              theme={theme}
            />
          </div>
        )}

        <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="p-4 md:p-6 lg:p-8 min-w-0">
            {renderPage()}
          </div>
        </main>

        {/* Backdrop для закрытия правого сайдбара на мобильных (невидимй) */}
        {rightSidebarOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ top: '64px' }}
            onClick={() => setRightSidebarOpen(false)}
          />
        )}

        {/* Правый сайдбар - показываем только когда открыт ИЛИ на десктопе */}
        {rightSidebarOpen && (
          <div className="fixed lg:static z-40 lg:z-0 right-0 h-full">
            <RightSidebar currentPage={currentPage} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}