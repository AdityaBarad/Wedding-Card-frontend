import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft } from 'lucide-react';

export function NewProject() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase.from('templates').select('*');
      if (error) console.error('Error fetching templates:', error);
      else setTemplates(data);
    }
    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{ name: name.trim(), template_id: selectedTemplate, user_id: user?.id }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) navigate(`/projects/${data.id}`);
    } catch (err) {
      setError('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Create New Project</h1>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-center">
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-6"
            />

            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Select Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`border-2 rounded-2xl cursor-pointer overflow-hidden transition-all transform hover:scale-105 ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 shadow-xl'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="relative aspect-square">
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <h3 className="font-medium text-gray-900 text-center">{template.name}</h3>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
