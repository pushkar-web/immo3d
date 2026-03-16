'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Plus,
  Building2,
  Clock,
  Layers,
  MoreVertical,
  Trash2,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import type { Project } from '@/types';

const statusColors: Record<string, string> = {
  ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  generating: 'bg-amber-50 text-amber-700 border border-amber-200',
  parsing: 'bg-blue-50 text-blue-700 border border-blue-200',
  uploading: 'bg-purple-50 text-purple-700 border border-purple-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
};

const typeIcons: Record<string, string> = {
  tower: '🏢',
  villa: '🏡',
  apartment: '🏬',
  commercial: '🏗️',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.buildingType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900">My Projects</h1>
              <p className="text-slate-500 mt-1">
                {projects.length} building{projects.length !== 1 ? 's' : ''} created
              </p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-400 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/20"
            >
              <Plus className="w-5 h-5" />
              New Project
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="tower">Tower</option>
                <option value="villa">Villa</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-100 border border-slate-200 h-80" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No projects found</h3>
              <p className="text-slate-400 mb-6">
                {search ? 'Try a different search term' : 'Upload a floor plan to create your first project'}
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="group rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl">{typeIcons[project.buildingType] || '🏗️'}</span>
                        <p className="text-xs text-slate-400 mt-2">3D Preview</p>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                      {project.status}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm text-primary-700 text-sm font-medium flex items-center gap-2 shadow-md">
                        <ExternalLink className="w-4 h-4" />
                        Open Project
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {project.name}
                      </h3>
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {project.floors} floors
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {project.style}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
