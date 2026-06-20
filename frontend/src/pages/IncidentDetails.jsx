import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIncidentById, patchIncidentStatus, closeIncidentAi } from '../api/incidents';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, Sparkles, TerminalSquare, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';

export default function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closeMode, setCloseMode] = useState('ai'); // 'ai' or 'manual'
  const [manualNote, setManualNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    try {
      const data = await getIncidentById(id);
      setIncident(data);
    } catch (error) {
      toast.error('Failed to load incident details');
      navigate('/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      if (closeMode === 'ai') {
        await closeIncidentAi(id);
        toast.success('AI resolution initiated. Status will update shortly.', { duration: 4000 });
      } else {
        if (!manualNote.trim()) {
          toast.error('Please enter a resolution note');
          setIsClosing(false);
          return;
        }
        await patchIncidentStatus(id, 'CLOSED', manualNote);
        toast.success('Incident closed successfully');
        fetchIncident(); // refresh data
      }
      
      if (closeMode === 'ai') {
        // Optimistically wait a bit then refresh or let user do it
        setTimeout(fetchIncident, 3000);
      }
    } catch (error) {
      toast.error('Failed to close incident');
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) return null;

  const isClosed = incident.status === 'CLOSED' || incident.status === 'RESOLVED';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Actions */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Main Details Card */}
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-8 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldAlert className={incident.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'} size={28} />
                <h1 className="text-3xl font-bold text-white">{incident.alertName}</h1>
              </div>
              <p className="text-slate-400">ID: {incident.id}</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold border backdrop-blur-md ${
              isClosed ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {incident.status}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div>
              <p className="text-slate-500 text-sm mb-1">Service</p>
              <p className="text-slate-200 font-medium">{incident.service}</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm mb-1">Severity</p>
              <p className="text-slate-200 font-medium capitalize">{incident.severity}</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm mb-1">Created At</p>
              <p className="text-slate-200 font-medium">
                {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>
            {incident.resolvedAt && (
              <div>
                <p className="text-slate-500 text-sm mb-1">Resolved At</p>
                <p className="text-slate-200 font-medium">
                  {new Date(incident.resolvedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* AI Analysis Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Sparkles className="text-purple-400" size={20} /> AI Analysis
            </h3>
            
            {incident.rootCause ? (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
                <h4 className="text-sm font-medium text-purple-300 mb-2">Probable Root Cause</h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{incident.rootCause}</p>
                
                {incident.confidenceScore && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-slate-500">AI Confidence Score:</span>
                    <div className="flex-1 max-w-[200px] h-2 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500" 
                        style={{ width: `${incident.confidenceScore * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-purple-400">{(incident.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-slate-400 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                AI is currently analyzing logs and metrics to determine the root cause...
              </div>
            )}
          </div>

          {/* Runbook Section */}
          {incident.runbookDraft && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <TerminalSquare className="text-blue-400" size={20} /> Suggested Runbook
              </h3>
              {(() => {
                let parsedRunbook;
                try {
                  parsedRunbook = JSON.parse(incident.runbookDraft);
                } catch (e) {
                  try {
                    // Python dicts are essentially valid JS object literals if we fix True/False/None
                    const jsValidStr = incident.runbookDraft
                      .replace(/\bTrue\b/g, 'true')
                      .replace(/\bFalse\b/g, 'false')
                      .replace(/\bNone\b/g, 'null');
                    
                    // eslint-disable-next-line no-new-func
                    parsedRunbook = new Function('return ' + jsValidStr)();
                  } catch (err) {
                    parsedRunbook = null;
                  }
                }

                if (parsedRunbook && typeof parsedRunbook === 'object') {
                  return (
                    <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 space-y-6 shadow-inner">
                      {/* Title & Severity */}
                      {(parsedRunbook.title || parsedRunbook.severity) && (
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                          {parsedRunbook.title && (
                            <h4 className="text-lg font-semibold text-blue-300">{parsedRunbook.title}</h4>
                          )}
                          {parsedRunbook.severity && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                              {parsedRunbook.severity}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Root Cause Explanation (from runbook) */}
                      {parsedRunbook.root_cause_explanation && (
                        <div>
                          <h4 className="text-sm font-medium text-purple-400 mb-2 uppercase tracking-wider">Identified Root Cause</h4>
                          <p className="text-slate-300 text-sm leading-relaxed bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                            {parsedRunbook.root_cause_explanation}
                          </p>
                        </div>
                      )}

                      {/* Triage Note (if exists) */}
                      {parsedRunbook.triage_note && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2 uppercase tracking-wider">Triage Note</h4>
                          <p className="text-slate-300 text-sm leading-relaxed bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                            {parsedRunbook.triage_note}
                          </p>
                        </div>
                      )}
                      
                      {/* Immediate Steps */}
                      {parsedRunbook.immediate_steps && parsedRunbook.immediate_steps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wider">Immediate Mitigation Steps</h4>
                          <ul className="space-y-3">
                            {parsedRunbook.immediate_steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-xs mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="pt-0.5 leading-relaxed font-mono text-slate-300">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prevention */}
                      {parsedRunbook.prevention && (
                        <div>
                          <h4 className="text-sm font-medium text-green-400 mb-2 uppercase tracking-wider">Prevention Strategy</h4>
                          <p className="text-slate-300 text-sm leading-relaxed bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                            {parsedRunbook.prevention}
                          </p>
                        </div>
                      )}

                      {/* Resolution Time & Confidence Footer */}
                      <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4 items-center justify-between">
                        {parsedRunbook.estimated_resolution_minutes && (
                          <div className="inline-flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20">
                            <Clock size={16} className="text-blue-400" />
                            <span className="text-slate-400 text-sm">Est. Resolution:</span>
                            <span className="text-blue-300 font-medium">{parsedRunbook.estimated_resolution_minutes} mins</span>
                          </div>
                        )}
                        {parsedRunbook.confidence && (
                          <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20">
                            <span className="text-slate-400 text-sm">Runbook Confidence:</span>
                            <span className="text-purple-300 font-medium">{(parsedRunbook.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Fallback rendering if parsing completely fails
                return (
                  <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 overflow-x-auto">
                    <pre className="text-blue-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                      {incident.runbookDraft}
                    </pre>
                  </div>
                );
              })()}

            </div>
          )}

          {/* Resolution Details */}
          {incident.resolutionNote && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <CheckCircle2 className="text-green-400" size={20} /> Resolution Note
              </h3>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                <p className="text-green-300 leading-relaxed whitespace-pre-wrap">
                  {incident.resolutionNote}
                </p>
              </div>
            </div>
          )}

          {/* Action Area (if open) */}
          {!isClosed && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Resolve Incident</h3>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setCloseMode('ai')}
                  className={`px-4 py-3 rounded-xl flex-1 border transition-all ${
                    closeMode === 'ai' 
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={18} className="mx-auto mb-2" />
                  <span className="block font-medium">Auto-Resolve via AI</span>
                  <span className="text-xs opacity-70 block mt-1">Gemini will analyze and write note</span>
                </button>
                
                <button
                  onClick={() => setCloseMode('manual')}
                  className={`px-4 py-3 rounded-xl flex-1 border transition-all ${
                    closeMode === 'manual' 
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <AlertTriangle size={18} className="mx-auto mb-2" />
                  <span className="block font-medium">Manual Resolution</span>
                  <span className="text-xs opacity-70 block mt-1">Write your own custom note</span>
                </button>
              </div>

              {closeMode === 'manual' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Resolution Note</label>
                  <textarea
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="Describe how the incident was resolved..."
                  />
                </div>
              )}

              <button
                onClick={handleClose}
                disabled={isClosing}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClosing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {closeMode === 'ai' ? 'Generate Note & Close' : 'Close Incident'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
