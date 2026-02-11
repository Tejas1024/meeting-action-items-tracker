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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            📋 Meeting Action Items Tracker
          </h1>
          <p className="text-gray-600">AI-powered action item extraction from meeting transcripts</p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              view === 'home'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            🏠 Home
          </button>
          <button
            onClick={() => { setView('history'); setError(''); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              view === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            📚 History
          </button>
          <button
            onClick={() => { setView('status'); setError(''); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              view === 'status'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            ❤️ Status
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Step 1: Paste Your Meeting Transcript</h2>
            <p className="text-gray-600 mb-4">
              Paste the text of your meeting notes below. Our AI will extract action items, owners, and due dates.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:outline-none font-mono text-sm"
              placeholder="Example:&#10;&#10;Meeting Notes - Q1 Planning&#10;Date: Feb 11, 2026&#10;&#10;Sarah: We need to finalize the budget by next Friday.&#10;John: I'll send the proposal to everyone by tomorrow.&#10;Mike: Can someone review the API docs? Blocking my work.&#10;Sarah: I'll review it by Wednesday..."
            />
            <button
              onClick={handleExtract}
              disabled={loading || !transcript.trim()}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '⏳ Extracting...' : '🚀 Extract Action Items'}
            </button>
          </div>
        )}

        {/* ACTIONS VIEW */}
        {view === 'actions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Action Items</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All ({actionItems.length})
                </button>
                <button
                  onClick={() => setFilter('open')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Open ({actionItems.filter(i => !i.is_done).length})
                </button>
                <button
                  onClick={() => setFilter('done')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'done' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Done ({actionItems.filter(i => i.is_done).length})
                </button>
              </div>
            </div>

            <button
              onClick={addItem}
              className="mb-4 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              ➕ Add New Item
            </button>

            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No action items found</p>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={() => toggleDone(item.id, item.is_done)}
                      className="w-6 h-6 mt-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium mb-1 cursor-pointer ${
                          item.is_done ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                        onClick={() => editItem(item.id, 'task', item.task)}
                      >
                        {item.task}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {item.owner && (
                          <span
                            className="text-blue-600 cursor-pointer hover:underline"
                            onClick={() => editItem(item.id, 'owner', item.owner)}
                          >
                            👤 {item.owner}
                          </span>
                        )}
                        {item.due_date && (
                          <span
                            className="text-orange-600 cursor-pointer hover:underline"
                            onClick={() => editItem(item.id, 'due_date', item.due_date)}
                          >
                            📅 {item.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all"
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Last 5 Transcripts</h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transcripts yet</p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    onClick={() => {
                      setCurrentTranscriptId(item.id);
                      loadActionItems(item.id);
                      setView('actions');
                    }}
                  >
                    <p className="text-sm text-gray-500 mb-2">
                      📅 {new Date(item.created_at).toLocaleString()}
                    </p>
                    <p className="text-gray-700 truncate">{item.content.substring(0, 150)}...</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STATUS VIEW */}
        {view === 'status' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">System Health Check</h2>
            {health ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg">
                  <span className="font-semibold text-gray-700">⚙️ Backend Server</span>
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      health.backend === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {health.backend}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg">
                  <span className="font-semibold text-gray-700">🗄️ Database (Supabase)</span>
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      health.database === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {health.database}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg">
                  <span className="font-semibold text-gray-700">🤖 LLM API (Claude)</span>
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      health.llm === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {health.llm}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Loading status...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
