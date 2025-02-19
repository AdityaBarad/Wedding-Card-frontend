import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function Dashboard() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at, guests (count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProjects(data.map(project => ({
          ...project,
          guest_count: project.guests[0].count
        })));
      }
      setLoading(false);
    };

    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="animate-pulse text-gray-500">Loading your projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8 padding-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Your Projects</h1>
          <Link
            to="/projects/new"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <Folder className="mx-auto h-20 w-20 text-gray-400 mb-6" />
            <h3 className="text-2xl font-medium text-gray-900">No projects found</h3>
            <p className="mt-2 text-gray-500">
              Get started by creating a new project.
            </p>
            <div className="mt-8">
              <Link
                to="/projects/new"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group block p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all transform hover:-translate-y-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <Folder className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {project.guest_count} guests
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Created on {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}