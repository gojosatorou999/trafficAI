import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AlertBanner from './AlertBanner';
import useAlerts from '../hooks/useAlerts';

export default function Layout() {
  const { alerts, wsConnected } = useAlerts();

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Alert Banner for global WebSocket events */}
      <AlertBanner alerts={alerts} />

      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar wsConnected={wsConnected} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col w-full">
        {/* Mobile header placeholder */}
        <div className="md:hidden flex h-16 items-center px-4 bg-slate-900">
           <span className="text-lg font-bold text-white">IntelliMobility AI</span>
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
