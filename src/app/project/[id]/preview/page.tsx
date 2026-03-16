'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Building2, Layers, Loader2, ExternalLink } from 'lucide-react';
import type { Project, NavigationState } from '@/types';

const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), { ssr: false });

export default function PreviewPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'exterior',
    floorIndex: null,
    flatId: null,
    roomId: null,
  });

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) setProject(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1a]">
        <Loader2 className="w-8 h-8 text-primary-400 spinner" />
      </div>
    );
  }

  if (!project?.layoutData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1a] text-gray-400">
        Project not found
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a]">
      {/* Header */}
      <div className="h-14 glass-dark flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{project.name}</h1>
            <p className="text-xs text-gray-500">{project.floors} floors · {project.style} style</p>
          </div>
        </div>
        <a
          href={`/project/${projectId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Full Editor
        </a>
      </div>

      {/* Viewer */}
      <div className="flex-1 relative">
        <ThreeViewer
          layout={project.layoutData}
          style={project.style}
          selectedFloor={selectedFloor}
          selectedRoom={null}
          cameraMode="orbit"
          isNightMode={false}
          showFurniture={true}
          onRoomClick={() => {}}
          navigation={navigation}
          onNavigate={(partial) => setNavigation((prev) => ({ ...prev, ...partial }))}
        />

        {/* Floor selector overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-xl glass-dark">
          <Layers className="w-4 h-4 text-gray-400 mr-2" />
          {project.layoutData.floors.slice(0, 10).map((floor) => (
            <button
              key={floor.level}
              onClick={() => {
                setSelectedFloor(floor.level);
                setNavigation({ level: 'floor', floorIndex: floor.level, flatId: null, roomId: null });
              }}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                selectedFloor === floor.level
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {floor.level === 0 ? 'G' : floor.level}
            </button>
          ))}
          {project.layoutData.floors.length > 10 && (
            <span className="text-xs text-gray-500 ml-1">+{project.layoutData.floors.length - 10}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center justify-center text-xs text-gray-600 shrink-0">
        Powered by <span className="text-primary-400 mx-1 font-semibold">Immo3D</span>
      </div>
    </div>
  );
}
