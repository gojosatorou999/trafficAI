import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import { Clock, Navigation, AlertTriangle, PlayCircle } from 'lucide-react';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function TransportPage() {
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState({});

  // Poll live positions every 2s
  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ['transport-live'],
    queryFn: () => api.get('/api/transport/live-positions').then(res => res.data),
    refetchInterval: 2000,
  });

  const handlePredictAll = async () => {
    setIsPredicting(true);
    try {
      // Predict concurrently for all routes
      const promises = routes.map(route => 
        api.post('/api/transport/predict-delay', {
          route_id: route.route_id,
          current_lat: route.current_lat,
          current_lng: route.current_lng,
        })
      );
      
      const results = await Promise.all(promises);
      const newPredictions = {};
      results.forEach(res => {
        newPredictions[res.data.route_id] = res.data;
      });
      setPredictions(newPredictions);
      refetchRoutes();
    } catch (e) {
      console.error('Prediction failed', e);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar: Route List */}
      <div className="w-full md:w-1/3 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-1">Transit Network</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Schedule Tracking</p>
          </div>
          <button
            onClick={handlePredictAll}
            disabled={isPredicting || routes.length === 0}
            className="flex items-center gap-2 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {isPredicting ? <Clock className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 text-teal-600" />}
            AI Predict
          </button>
        </div>
        
        <div className="p-0 flex-1 overflow-y-auto bg-slate-50/50">
          <ul className="divide-y divide-slate-100">
            {routes.map(route => {
              const pred = predictions[route.route_id];
              const isDelayed = route.delay_minutes > 2 || route.status === 'DELAYED';
              
              return (
                <li key={route.route_id} className="p-5 hover:bg-white transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">{route.route_id}</span>
                        <span className="font-bold text-slate-800 group-hover:text-blue-600">{route.origin} → {route.destination}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                        <Navigation className="w-3 h-3" /> Bus ID: {route.bus_id}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset ${isDelayed ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                        {isDelayed ? `Delayed ${route.delay_minutes}m` : 'On Time'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Prediction Expanded View */}
                  {pred && (
                    <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm">
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1">AI Prediction ({pred.confidence})</p>
                          <p className="text-slate-600 mb-2">{pred.reason}</p>
                          <p className="text-xs bg-white border border-blue-100 italic text-slate-500 p-2 rounded">{pred.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <BaseMap>
          {routes.map(route => (
            <Marker key={route.route_id} position={[route.current_lat, route.current_lng]}>
              <Popup>
                <div className="font-bold border-b pb-2 mb-2">{route.origin} → {route.destination}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-500">Route ID:</span>
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">{route.route_id}</span>
                  <span className="text-slate-500">Bus ID:</span>
                  <span className="font-medium text-slate-700">{route.bus_id}</span>
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-semibold ${route.delay_minutes > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{route.status} ({route.delay_minutes} min)</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </BaseMap>
      </div>
    </div>
  );
}
