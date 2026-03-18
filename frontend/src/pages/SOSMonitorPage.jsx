import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { BellRing, CheckCircle, Clock } from 'lucide-react';
import api from '../api/client';
import SeverityBadge from '../components/SeverityBadge';

export default function SOSMonitorPage() {
  const { data: sosReports = [], refetch } = useQuery({
    queryKey: ['sos-history'],
    queryFn: () => api.get('/api/emergency/sos/history').then(res => res.data),
    refetchInterval: 3000,
  });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/emergency/sos/${id}/status`, { status });
      refetch();
    } catch (e) {
      console.error('Failed to update SOS status', e);
    }
  };

  const statusColors = {
    RECEIVED: 'bg-red-100 text-red-800 ring-red-600/20',
    DISPATCHED: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    RESOLVED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <BellRing className="w-7 h-7 text-red-600" />
          Emergency SOS Dispatch Monitor
        </h1>
        <p className="mt-1 text-sm text-slate-500">Centralized view for user-submitted SOS triggers and dispatch logistics.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {sosReports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">All Clear</h3>
              <p className="mt-1 text-sm text-slate-500">No active SOS requests.</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Time</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">User ID</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Location</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Details</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Priority</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sosReports.map((sos) => (
                    <tr key={sos.id} className={sos.status === 'RECEIVED' ? 'bg-red-50/30' : ''}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {formatDistanceToNow(new Date(sos.created_at || new Date()), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-mono">{sos.user_id}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {sos.lat.toFixed(4)}, {sos.lng.toFixed(4)}
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-700 max-w-xs truncate" title={sos.description}>
                        {sos.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <SeverityBadge severity={sos.severity} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[sos.status]}`}>
                          {sos.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                        {sos.status === 'RECEIVED' && (
                          <button onClick={() => updateStatus(sos.id, 'DISPATCHED')} className="text-yellow-600 hover:text-yellow-900">Dispatch</button>
                        )}
                        {sos.status === 'DISPATCHED' && (
                          <button onClick={() => updateStatus(sos.id, 'RESOLVED')} className="text-emerald-600 hover:text-emerald-900">Resolve</button>
                        )}
                        {sos.status === 'RESOLVED' && (
                          <span className="text-slate-400 cursor-not-allowed">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
