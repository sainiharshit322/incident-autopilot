import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents, createAlert } from '../api/incidents';
import { AlertTriangle, Clock, CheckCircle, Activity, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertForm, setAlertForm] = useState({
    alertName: '',
    severity: '',
    service: '',
    description: ''
  });
  
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

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.alertName || !alertForm.service) {
      toast.error('Alert Name and Service are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createAlert(alertForm);
      toast.success('Simulated alert created successfully!');
      setShowModal(false);
      setAlertForm({ alertName: '', severity: 'HIGH', service: '', description: '' });
      fetchIncidents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
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
  const activeCount = incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
  const closedCount = incidents.length - activeCount;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={18} /> Simulate Alert
        </button>
      </div>

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulate Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-orange-500" /> Simulate Webhook Alert
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Alert Name</label>
                <input 
                  type="text" 
                  value={alertForm.alertName}
                  onChange={(e) => setAlertForm({...alertForm, alertName: e.target.value})}
                  placeholder="e.g. High CPU Usage Detected"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Service Name</label>
                  <input 
                    type="text" 
                    value={alertForm.service}
                    onChange={(e) => setAlertForm({...alertForm, service: e.target.value})}
                    placeholder="e.g. payment-service"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Severity</label>
                  <select 
                    value={alertForm.severity}
                    onChange={(e) => setAlertForm({...alertForm, severity: e.target.value})}
                    className="w-full bg-[#1f2937] border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                  >
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                <textarea 
                  value={alertForm.description}
                  onChange={(e) => setAlertForm({...alertForm, description: e.target.value})}
                  placeholder="Additional payload details..."
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-300 hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Fire Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
