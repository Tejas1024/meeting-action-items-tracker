import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [view, setView] = useState('home');
  const [transcript, setTranscript] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTranscriptId, setCurrentTranscriptId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (view === 'history') loadHistory();
    if (view === 'status') checkHealth();
  }, [view]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      setError('Failed to load history: ' + err.message);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ backend: 'unhealthy', database: 'unhealthy', llm: 'unhealthy' });
    }
  };

  const handleExtract = async () => {
    if (!transcript.trim()) {
      setError('Please enter a transcript');
      return;
    }

    if (transcript.trim().length < 10) {
      setError('Transcript must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save transcript
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .insert({ content: transcript })
        .select()
        .single();

      if (transcriptError) throw transcriptError;

      // Extract action items
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const { actionItems: extracted } = await res.json();

      if (extracted && extracted.length > 0) {
        // Save action items
        const itemsToInsert = extracted.map(item => ({
          transcript_id: transcriptData.id,
          task: item.task || 'Untitled task',
          owner: item.owner || null,
          due_date: item.due_date || null
        }));

        const { error: itemsError } = await supabase
          .from('action_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      setCurrentTranscriptId(transcriptData.id);
      await loadActionItems(transcriptData.id);
      setView('actions');
      setTranscript('');
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActionItems = async (transcriptId) => {
    try {
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('transcript_id', transcriptId)
        .order('created_at');
      
      if (error) throw error;
      setActionItems(data || []);
    } catch (err) {
      setError('Failed to load action items: ' + err.message);
    }
  };

  const toggleDone = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('action_items')
        .update({ is_done: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      await loadActionItems(currentTranscriptId);
    } catch (err) {
      setError('Failed to update item: ' + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Delete this action item?')) return;
    
    try {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadActionItems(currentTranscriptId);
    } catch (err) {
      setError('Failed to delete item: ' + err.message);
    }
  };

  const addItem = async () => {
    const task = prompt('Enter task:');
    if (!task || !task.trim()) return;
    
    const owner = prompt('Enter owner (optional):');
    const due_date = prompt('Enter due date (optional):');

    try {
      const { error } = await supabase.from('action_items').insert({
        transcript_id: currentTranscriptId,
        task: task.trim(),
        owner: owner?.trim() || null,
        due_date: due_date?.trim() || null
      });
      
      if (error) throw error;
      await loadActionItems(currentTranscriptId);
    } catch (err) {
      setError('Failed to add item: ' + err.message);
    }
  };

  const editItem = async (id, field, currentValue) => {
    const newValue = prompt(`Edit ${field}:`, currentValue || '');
    if (newValue === null) return;

    try {
      const { error } = await supabase
        .from('action_items')
        .update({ [field]: newValue.trim() || null })
        .eq('id', id);
      
      if (error) throw error;
      await loadActionItems(currentTranscriptId);
    } catch (err) {
      setError('Failed to edit item: ' + err.message);
    }
  };

  const filteredItems = actionItems.filter(item => {
    if (filter === 'done') return item.is_done;
    if (filter === 'open') return !item.is_done;
    return true;
  });

  const bgClass = darkMode 
    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50';
  
  const cardClass = darkMode 
    ? 'bg-gray-800/50 backdrop-blur-lg border border-purple-500/30' 
    : 'bg-white/80 backdrop-blur-sm';
  
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const textMutedClass = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} p-4 md:p-8 transition-all duration-500`}>
      <div className="max-w-6xl mx-auto">
        {/* Header with Dark Mode Toggle */}
        <div className={`${cardClass} rounded-2xl shadow-2xl p-6 mb-6 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className={`text-4xl md:text-5xl font-bold ${textClass} mb-2 flex items-center gap-3`}>
                <span className="animate-pulse">🤖</span>
                Meeting AI Tracker
              </h1>
              <p className={textMutedClass}>Powered by Gemini AI • Extract, Manage, Achieve</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-3 mb-6">
          {['home', 'history', 'status'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setView(tab); setError(''); }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                view === tab
                  ? darkMode
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : darkMode
                  ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                  : 'bg-white/50 text-gray-700 hover:bg-white'
              }`}
            >
              {tab === 'home' && '🏠 Home'}
              {tab === 'history' && '📚 History'}
              {tab === 'status' && '💚 Status'}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className={`${darkMode ? 'bg-red-900/50 border-red-500' : 'bg-red-50 border-red-200'} border px-4 py-3 rounded-xl mb-6 backdrop-blur-sm`}>
            <p className={darkMode ? 'text-red-200' : 'text-red-700'}>{error}</p>
          </div>
        )}

        {/* HOME VIEW */}
        {view === 'home' && (
          <div className={`${cardClass} rounded-2xl shadow-2xl p-8`}>
            <h2 className={`text-3xl font-bold ${textClass} mb-4 flex items-center gap-2`}>
              <span>✨</span> Paste Your Meeting Transcript
            </h2>
            <p className={`${textMutedClass} mb-6`}>
              AI will automatically extract action items, assign owners, and detect due dates.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className={`w-full h-80 p-6 ${
                darkMode 
                  ? 'bg-gray-900/50 border-purple-500/30 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-800'
              } border-2 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm transition-all`}
              placeholder="Example:&#10;&#10;Sprint Planning - Feb 12, 2026&#10;&#10;Rahul: We need to finalize authentication by Monday.&#10;Tejas: I'll fix refresh token logic by tomorrow evening.&#10;Ananya: Frontend ready, waiting on API docs.&#10;Rahul: Tejas, update Swagger docs once auth is done."
            />
            <button
              onClick={handleExtract}
              disabled={loading || !transcript.trim()}
              className={`mt-6 w-full md:w-auto px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:transform-none ${
                loading || !transcript.trim()
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : darkMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
              }`}
            >
              {loading ? '⏳ Extracting with AI...' : '🚀 Extract Action Items'}
            </button>
          </div>
        )}

        {/* ACTIONS VIEW */}
        {view === 'actions' && (
          <div className={`${cardClass} rounded-2xl shadow-2xl p-8`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
              <h2 className={`text-3xl font-bold ${textClass}`}>📋 Action Items</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: actionItems.length },
                  { key: 'open', label: 'Open', count: actionItems.filter(i => !i.is_done).length },
                  { key: 'done', label: 'Done', count: actionItems.filter(i => i.is_done).length }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                      filter === key
                        ? darkMode
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                        : darkMode
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addItem}
              className={`mb-6 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
              }`}
            >
              ➕ Add New Item
            </button>

            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <p className={`${textMutedClass} text-center py-12 text-lg`}>No action items found</p>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex flex-col md:flex-row items-start md:items-center gap-4 p-6 ${
                      darkMode 
                        ? 'bg-gray-700/30 border border-purple-500/20 hover:border-purple-500/50' 
                        : 'bg-white/70 border-2 border-gray-200 hover:border-blue-300'
                    } rounded-xl transition-all`}
                  >
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={() => toggleDone(item.id, item.is_done)}
                      className="w-7 h-7 cursor-pointer accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-lg font-semibold mb-2 cursor-pointer ${
                          item.is_done 
                            ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                            : textClass
                        }`}
                        onClick={() => editItem(item.id, 'task', item.task)}
                      >
                        {item.task}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {item.owner && (
                          <span
                            className="flex items-center gap-1 text-blue-400 cursor-pointer hover:underline"
                            onClick={() => editItem(item.id, 'owner', item.owner)}
                          >
                            👤 {item.owner}
                          </span>
                        )}
                        {item.due_date && (
                          <span
                            className="flex items-center gap-1 text-orange-400 cursor-pointer hover:underline"
                            onClick={() => editItem(item.id, 'due_date', item.due_date)}
                          >
                            📅 {item.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className={`${cardClass} rounded-2xl shadow-2xl p-8`}>
            <h2 className={`text-3xl font-bold ${textClass} mb-6`}>📚 Last 5 Transcripts</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className={`${textMutedClass} text-center py-12 text-lg`}>No transcripts yet</p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className={`p-6 ${
                      darkMode
                        ? 'bg-gray-700/30 border border-purple-500/20 hover:border-purple-500/50 hover:bg-gray-700/50'
                        : 'bg-white/70 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    } rounded-xl cursor-pointer transition-all`}
                    onClick={() => {
                      setCurrentTranscriptId(item.id);
                      loadActionItems(item.id);
                      setView('actions');
                    }}
                  >
                    <p className={`text-sm ${textMutedClass} mb-3`}>
                      📅 {new Date(item.created_at).toLocaleString()}
                    </p>
                    <p className={textClass}>{item.content.substring(0, 200)}...</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STATUS VIEW */}
        {view === 'status' && (
          <div className={`${cardClass} rounded-2xl shadow-2xl p-8`}>
            <h2 className={`text-3xl font-bold ${textClass} mb-6`}>💚 System Health</h2>
            {health ? (
              <div className="space-y-4">
                {[
                  { icon: '⚙️', label: 'Backend Server', key: 'backend' },
                  { icon: '🗄️', label: 'Database (Supabase)', key: 'database' },
                  { icon: '🤖', label: 'AI API (Gemini)', key: 'llm' }
                ].map(({ icon, label, key }) => (
                  <div
                    key={key}
                    className={`flex justify-between items-center p-6 ${
                      darkMode 
                        ? 'bg-gray-700/30 border border-purple-500/20' 
                        : 'bg-white/70 border-2 border-gray-200'
                    } rounded-xl`}
                  >
                    <span className={`text-lg font-semibold ${textClass} flex items-center gap-2`}>
                      <span className="text-2xl">{icon}</span>
                      {label}
                    </span>
                    <span
                      className={`px-6 py-3 rounded-lg font-bold text-lg ${
                        health[key] === 'healthy'
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                          : 'bg-red-500/20 text-red-400 border-2 border-red-500'
                      }`}
                    >
                      {health[key] === 'healthy' ? '✓ Healthy' : '✗ Unhealthy'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`${textMutedClass} text-center py-12 text-lg`}>Loading status...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
