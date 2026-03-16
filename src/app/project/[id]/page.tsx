'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Layers,
  ChevronRight,
  ChevronLeft,
  Maximize,
  Sun,
  Moon,
  Camera,
  Eye,
  Navigation,
  Sofa,
  Download,
  RotateCcw,
  Play,
  Ruler,
  Palette,
  Loader2,
  PanelLeftClose,
  PanelRightClose,
  Home,
  Building2,
  DoorOpen,
  ArrowUp,
} from 'lucide-react';
import ExportModal from '@/components/ExportModal';
import AIAssistant from '@/components/AIAssistant';
import type { Project, RoomData, FloorData, FlatData, NavigationState, NavigationLevel } from '@/types';
import { DESIGN_STYLES } from '@/lib/building-data';

const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), { ssr: false });

const roomTypeLabels: Record<string, string> = {
  living: 'Living Room', bedroom: 'Bedroom', bathroom: 'Bathroom',
  kitchen: 'Kitchen', balcony: 'Balcony', lobby: 'Lobby',
  corridor: 'Corridor', lift: 'Lift', dining: 'Dining Room',
  study: 'Study', storage: 'Storage',
};

const roomTypeColors: Record<string, string> = {
  living: 'bg-emerald-500/20 text-emerald-400',
  bedroom: 'bg-indigo-500/20 text-indigo-400',
  bathroom: 'bg-cyan-500/20 text-cyan-400',
  kitchen: 'bg-amber-500/20 text-amber-400',
  balcony: 'bg-green-500/20 text-green-400',
  lobby: 'bg-gray-500/20 text-gray-400',
  corridor: 'bg-gray-500/20 text-gray-400',
  dining: 'bg-orange-500/20 text-orange-400',
  study: 'bg-purple-500/20 text-purple-400',
  storage: 'bg-stone-500/20 text-stone-400',
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [cameraMode, setCameraMode] = useState<'walkthrough' | 'flythrough' | 'orbit'>('orbit');
  const [isNightMode, setIsNightMode] = useState(false);
  const [showFurniture, setShowFurniture] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Navigation state for building hierarchy
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'exterior',
    floorIndex: null,
    flatId: null,
    roomId: null,
  });

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [projectId]);

  const onRoomClick = useCallback((room: RoomData) => {
    setSelectedRoom(room);
    setRightOpen(true);
  }, []);

  const navigate = useCallback((partial: Partial<NavigationState>) => {
    setNavigation((prev) => ({ ...prev, ...partial }));
  }, []);

  const navigateUp = useCallback(() => {
    setNavigation((prev) => {
      if (prev.level === 'room') return { ...prev, level: 'flat' as NavigationLevel, roomId: null };
      if (prev.level === 'flat') return { ...prev, level: 'floor' as NavigationLevel, flatId: null };
      if (prev.level === 'floor') return { ...prev, level: 'lobby' as NavigationLevel, floorIndex: null };
      if (prev.level === 'lobby') return { level: 'exterior', floorIndex: null, flatId: null, roomId: null };
      return prev;
    });
    setSelectedRoom(null);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  // Derived state
  const currentFloor: FloorData | undefined =
    navigation.floorIndex !== null ? project?.layoutData?.floors[navigation.floorIndex] : undefined;
  const currentFlat: FlatData | undefined =
    navigation.flatId ? currentFloor?.flats.find((f) => f.id === navigation.flatId) : undefined;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-400 spinner mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project || !project.layoutData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Project not found</p>
          <button onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded-lg bg-primary-600 text-white">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const styleInfo = DESIGN_STYLES.find((s) => s.id === project.style);

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 glass-dark flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <h1 className="text-sm font-semibold truncate max-w-[200px]">{project.name}</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {project.floors} floors · {project.style}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Camera mode buttons */}
          {[
            { mode: 'orbit' as const, icon: Eye, label: 'Orbit' },
            { mode: 'walkthrough' as const, icon: Navigation, label: 'Walk' },
            { mode: 'flythrough' as const, icon: Camera, label: 'Fly' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                cameraMode === mode
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}

          <div className="w-px h-5 bg-gray-700 mx-1" />

          <button onClick={() => setIsNightMode(!isNightMode)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" title={isNightMode ? 'Day Mode' : 'Night Mode'}>
            {isNightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowFurniture(!showFurniture)}
            className={`p-1.5 rounded-lg transition-colors ${showFurniture ? 'text-primary-400 bg-primary-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Toggle Furniture"
          >
            <Sofa className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" title="Fullscreen">
            <Maximize className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-700 mx-1" />

          <button onClick={() => setExportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500 text-white text-xs font-medium hover:bg-accent-400 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className={`shrink-0 transition-all duration-300 ${leftOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
          <div className="w-64 h-full glass-dark border-r border-gray-800/50 flex flex-col">
            {/* Project info */}
            <div className="p-4 border-b border-gray-800/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Building</p>
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-gray-500 capitalize">{project.buildingType} · {project.floors} floors</p>
              {project.scanSummary && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Scan Results</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-1.5 rounded-lg bg-gray-800/30 text-center">
                      <p className="text-sm font-semibold text-primary-400">
                        {project.scanSummary.confidence}%
                      </p>
                      <p className="text-[10px] text-gray-600">Confidence</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-800/30 text-center">
                      <p className="text-sm font-semibold text-primary-400">
                        {project.scanSummary.format}
                      </p>
                      <p className="text-[10px] text-gray-600">Format</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-800/30 text-center col-span-2">
                      <p className="text-sm font-semibold text-accent-400">
                        {project.scanSummary.estimatedAreaSqm.toLocaleString()} m²
                      </p>
                      <p className="text-[10px] text-gray-600">Estimated Area</p>
                    </div>
                  </div>
                  {project.scanSummary.notes.length > 0 && (
                    <div className="text-[11px] text-gray-500 space-y-0.5">
                      {project.scanSummary.notes.map((note: string, i: number) => (
                        <p key={i}>· {note}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation breadcrumb */}
            <div className="p-3 border-b border-gray-800/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Navigation
              </p>
              <div className="flex items-center gap-1 flex-wrap text-xs">
                <button
                  onClick={() => setNavigation({ level: 'exterior', floorIndex: null, flatId: null, roomId: null })}
                  className={`px-2 py-1 rounded ${navigation.level === 'exterior' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-400 hover:text-white'}`}
                >
                  Exterior
                </button>
                <ChevronRight className="w-3 h-3 text-gray-600" />
                <button
                  onClick={() => navigate({ level: 'lobby', floorIndex: null, flatId: null, roomId: null })}
                  className={`px-2 py-1 rounded ${navigation.level === 'lobby' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-400 hover:text-white'}`}
                >
                  Lobby
                </button>
                {navigation.floorIndex !== null && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                    <span className="text-primary-300 px-2 py-1">
                      {currentFloor?.label}
                    </span>
                  </>
                )}
                {navigation.flatId && currentFlat && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                    <span className="text-primary-300 px-2 py-1">
                      {currentFlat.name}
                    </span>
                  </>
                )}
              </div>
              {navigation.level !== 'exterior' && (
                <button
                  onClick={navigateUp}
                  className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                  Go up
                </button>
              )}
            </div>

            {/* Floor selector */}
            <div className="p-3 border-b border-gray-800/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                Floors
              </p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {project.layoutData.floors.map((floor) => (
                  <button
                    key={floor.level}
                    onClick={() => {
                      navigate({ level: 'floor', floorIndex: floor.level, flatId: null, roomId: null });
                      setSelectedRoom(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      navigation.floorIndex === floor.level
                        ? 'bg-primary-500/20 text-primary-300 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {floor.label}
                    <span className="text-xs text-gray-600 ml-2">{floor.flats.length} flats</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Flats on selected floor */}
            {currentFloor && (
              <div className="p-3 border-b border-gray-800/50">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DoorOpen className="w-3 h-3" />
                  Flats — {currentFloor.label}
                </p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {currentFloor.flats.map((flat) => (
                    <button
                      key={flat.id}
                      onClick={() => {
                        navigate({ level: 'flat', flatId: flat.id, roomId: null });
                        setSelectedRoom(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        navigation.flatId === flat.id
                          ? 'bg-primary-500/20 text-primary-300 font-medium'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      {flat.name}
                      <span className="text-xs text-gray-600 ml-2">{flat.position}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rooms in selected flat */}
            {currentFlat && (
              <div className="flex-1 p-3 overflow-y-auto">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Home className="w-3 h-3" />
                  Rooms — {currentFlat.name}
                </p>
                <div className="space-y-0.5">
                  {currentFlat.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        setSelectedRoom(room);
                        setRightOpen(true);
                        navigate({ level: 'room', roomId: room.id });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedRoom?.id === room.id
                          ? 'bg-primary-500/20 text-primary-300'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${roomTypeColors[room.type]?.split(' ')[0] || 'bg-gray-500/20'}`} />
                      <span className="truncate">{room.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle left sidebar */}
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 ml-1 p-1 rounded-r-lg bg-gray-800/80 text-gray-400 hover:text-white transition-colors"
          style={{ left: leftOpen ? '16rem' : '0' }}
        >
          {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative">
          <div className="w-full h-full canvas-container">
            <ThreeViewer
              layout={project.layoutData}
              style={project.style}
              selectedFloor={navigation.floorIndex ?? 0}
              selectedRoom={selectedRoom}
              cameraMode={cameraMode}
              isNightMode={isNightMode}
              showFurniture={showFurniture}
              onRoomClick={onRoomClick}
              navigation={navigation}
              onNavigate={navigate}
            />
          </div>

          {/* Bottom bar overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            <button
              onClick={() => {
                setNavigation({ level: 'exterior', floorIndex: null, flatId: null, roomId: null });
                setSelectedRoom(null);
              }}
              className="px-3 py-2 rounded-lg glass-dark text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset View
            </button>
            <button className="px-3 py-2 rounded-lg glass-dark text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Auto Fly-Through
            </button>
            <button className="px-3 py-2 rounded-lg glass-dark text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              Measure
            </button>
          </div>

          {/* Navigation level indicator */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg glass-dark text-xs text-gray-300">
            {navigation.level === 'exterior' && 'Exterior View'}
            {navigation.level === 'lobby' && 'Lobby'}
            {navigation.level === 'floor' && currentFloor && currentFloor.label}
            {navigation.level === 'flat' && currentFlat && `${currentFloor?.label} → ${currentFlat.name}`}
            {navigation.level === 'room' && selectedRoom && (
              <span>{currentFlat?.name} → <span className="text-primary-400">{selectedRoom.name}</span></span>
            )}
          </div>
        </div>

        {/* Toggle right panel */}
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 mr-1 p-1 rounded-l-lg bg-gray-800/80 text-gray-400 hover:text-white transition-colors"
          style={{ right: rightOpen ? '20rem' : '0' }}
        >
          {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Right Panel */}
        <div className={`shrink-0 transition-all duration-300 ${rightOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <div className="w-80 h-full glass-dark border-l border-gray-800/50 flex flex-col overflow-y-auto">
            {selectedRoom ? (
              <>
                {/* Room Header */}
                <div className="p-4 border-b border-gray-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{selectedRoom.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roomTypeColors[selectedRoom.type] || 'bg-gray-500/20 text-gray-400'}`}>
                      {roomTypeLabels[selectedRoom.type] || selectedRoom.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {currentFlat ? `${currentFlat.name} · ` : ''}{selectedRoom.width}m x {selectedRoom.depth}m x {selectedRoom.height}m
                  </p>
                </div>

                {/* Dimensions */}
                <div className="p-4 border-b border-gray-800/50">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Ruler className="w-3 h-3" />
                    Dimensions
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-gray-800/30">
                      <p className="text-lg font-semibold text-primary-400">{selectedRoom.width}</p>
                      <p className="text-xs text-gray-500">Width (m)</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-800/30">
                      <p className="text-lg font-semibold text-primary-400">{selectedRoom.depth}</p>
                      <p className="text-xs text-gray-500">Depth (m)</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-800/30">
                      <p className="text-lg font-semibold text-primary-400">{selectedRoom.height}</p>
                      <p className="text-xs text-gray-500">Height (m)</p>
                    </div>
                  </div>
                  <div className="mt-2 text-center p-2 rounded-lg bg-gray-800/30">
                    <p className="text-lg font-semibold text-accent-400">{(selectedRoom.width * selectedRoom.depth).toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Area (m²)</p>
                  </div>
                </div>

                {/* Components */}
                <div className="p-4 border-b border-gray-800/50">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Components</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Doors</span><span className="text-white">{selectedRoom.doors.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Windows</span><span className="text-white">{selectedRoom.windows.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Furniture</span><span className="text-white">{selectedRoom.furniture.length} items</span>
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div className="p-4 border-b border-gray-800/50">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Palette className="w-3 h-3" />
                    Applied Style
                  </h4>
                  {styleInfo && (
                    <div className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/50">
                      <p className="text-sm font-medium">{styleInfo.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{styleInfo.description}</p>
                      <div className="flex gap-1.5 mt-2">
                        {Object.entries(styleInfo.colors).map(([key, color]) => (
                          <div key={key} className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full border border-gray-600" style={{ backgroundColor: color }} />
                            <span className="text-[10px] text-gray-600 capitalize">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4">
                  <button className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors flex items-center justify-center gap-2">
                    <Palette className="w-4 h-4" />
                    Re-generate with New Style
                  </button>
                </div>
              </>
            ) : currentFlat ? (
              /* Flat info when no room selected */
              <div className="p-4">
                <h3 className="font-semibold mb-2">{currentFlat.name}</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Unit {currentFlat.unitNumber} · {currentFlat.position} · {currentFlat.rooms.length} rooms
                </p>
                <div className="space-y-1">
                  {currentFlat.rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between text-sm text-gray-400 p-2 rounded-lg hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${roomTypeColors[room.type]?.split(' ')[0] || 'bg-gray-500/20'}`} />
                        {room.name}
                      </span>
                      <span className="text-xs text-gray-600">{(room.width * room.depth).toFixed(0)}m²</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg bg-gray-800/30 text-center">
                  <p className="text-lg font-semibold text-accent-400">
                    {currentFlat.rooms.reduce((sum, r) => sum + r.width * r.depth, 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Total Area (m²)</p>
                </div>
              </div>
            ) : (
              /* No selection */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">Select a flat or room</p>
                  <p className="text-xs text-gray-600">
                    Navigate through floors and flats in the sidebar, or click in the 3D view
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {exportOpen && (
        <ExportModal projectId={project.id} projectName={project.name} onClose={() => setExportOpen(false)} />
      )}

      {/* AI Assistant */}
      <AIAssistant projectId={project.id} />
    </div>
  );
}
