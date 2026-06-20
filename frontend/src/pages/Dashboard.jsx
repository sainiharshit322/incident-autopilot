import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents } from '../api/incidents';
import { AlertTriangle, Clock, CheckCircle, ChevronRight, Activity } from 'lucide-react';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await getIncidents();
      // sort by created at desc
      const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setIncidents(sorted);
    } catch (error) {
      console.error("Failed to fetch incidents", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'IN_PROGRESS': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'RESOLVED':
      case 'CLOSED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return <AlertTriangle className="text-red-500" size={18} />;
      case 'HIGH': return <AlertTriangle className="text-orange-500" size={18} />;
      case 'MEDIUM': return <Activity className="text-yellow-500" size={18} />;
      default: return <AlertTriangle className="text-blue-500" size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  // Summary stats
  const activeCount = incidents.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const closedCount = incidents.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Activity className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Incidents</p>
              <h3 className="text-2xl font-bold text-white">{incidents.length}</h3>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-red-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Active Issues</p>
              <h3 className="text-2xl font-bold text-white">{activeCount}</h3>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-green-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Resolved</p>
              <h3 className="text-2xl font-bold text-white">{closedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-semibold text-white">Recent Incidents</h2>
          <button onClick={fetchIncidents} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Refresh
          </button>
        </div>
        
        {incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No incidents found. All systems operational.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-sm">
                  <th className="px-6 py-4 font-medium">Alert Name</th>
                  <th className="px-6 py-4 font-medium">Service</th>
                  <th className="px-6 py-4 font-medium">Severity</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incidents.map((incident) => (
                  <tr 
                    key={incident.id} 
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{incident.alertName}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{incident.id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{incident.service}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(incident.severity)}
                        <span className="capitalize">{incident.severity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm flex items-center gap-2">
                      <Clock size={14} />
                      {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={20} className="inline text-slate-500 group-hover:text-white transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
