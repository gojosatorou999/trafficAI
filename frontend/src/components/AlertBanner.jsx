import { useState, useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export default function AlertBanner({ alerts }) {
  const [visibleAlert, setVisibleAlert] = useState(null);

  useEffect(() => {
    // Show the most recent narrator alert
    const narratorAlerts = alerts.filter(a => a.type === 'NARRATOR' || a.type === 'SOS');
    if (narratorAlerts.length > 0) {
      const latest = narratorAlerts[narratorAlerts.length - 1];
      setVisibleAlert(latest);
      
      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        setVisibleAlert(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  if (!visibleAlert) return null;

  const isCritical = visibleAlert.severity === 'CRITICAL' || visibleAlert.severity === 'HIGH' || visibleAlert.type === 'SOS';
  const bgColor = isCritical ? 'bg-red-600' : 'bg-blue-600';
  const Icon = isCritical ? AlertTriangle : Info;

  return (
    <div className={`fixed top-0 inset-x-0 pb-2 sm:pb-5 z-50 transform transition-transform duration-500`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className={`p-2 rounded-lg shadow-lg sm:p-3 ${bgColor}`}>
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center shadow-sm">
              <span className={`flex p-2 rounded-lg ${isCritical ? 'bg-red-800' : 'bg-blue-800'}`}>
                <Icon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="md:hidden">Emergency Broadcast</span>
                <span className="hidden md:inline">
                  <span className="font-bold mr-2">[{visibleAlert.type}]</span>
                  {visibleAlert.payload?.narrative || visibleAlert.payload?.description || 'Emergency alert'}
                </span>
              </p>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
              <button
                type="button"
                onClick={() => setVisibleAlert(null)}
                className={`-mr-1 flex p-2 rounded-md hover:bg-opacity-20 hover:bg-white focus:outline-none`}
              >
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
