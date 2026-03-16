import { create } from 'zustand';
import type { Project, User, RoomData, DesignStyle } from '@/types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // 3D Viewer
  selectedFloor: number;
  selectedRoom: RoomData | null;
  cameraMode: 'walkthrough' | 'flythrough' | 'orbit';
  isNightMode: boolean;
  showFurniture: boolean;
  setSelectedFloor: (floor: number) => void;
  setSelectedRoom: (room: RoomData | null) => void;
  setCameraMode: (mode: 'walkthrough' | 'flythrough' | 'orbit') => void;
  toggleNightMode: () => void;
  toggleFurniture: () => void;

  // UI
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  exportModalOpen: boolean;
  uploadModalOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setExportModalOpen: (open: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;

  // Upload
  uploadProgress: number;
  uploadStatus: string;
  selectedStyle: DesignStyle;
  budget: number;
  furnishingDensity: number;
  lightingIntensity: number;
  setUploadProgress: (progress: number) => void;
  setUploadStatus: (status: string) => void;
  setSelectedStyle: (style: DesignStyle) => void;
  setBudget: (budget: number) => void;
  setFurnishingDensity: (density: number) => void;
  setLightingIntensity: (intensity: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // Projects
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  // 3D Viewer
  selectedFloor: 0,
  selectedRoom: null,
  cameraMode: 'orbit',
  isNightMode: false,
  showFurniture: true,
  setSelectedFloor: (selectedFloor) => set({ selectedFloor }),
  setSelectedRoom: (selectedRoom) => set({ selectedRoom }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleNightMode: () => set((state) => ({ isNightMode: !state.isNightMode })),
  toggleFurniture: () =>
    set((state) => ({ showFurniture: !state.showFurniture })),

  // UI
  leftSidebarOpen: true,
  rightPanelOpen: true,
  exportModalOpen: false,
  uploadModalOpen: false,
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setExportModalOpen: (exportModalOpen) => set({ exportModalOpen }),
  setUploadModalOpen: (uploadModalOpen) => set({ uploadModalOpen }),

  // Upload
  uploadProgress: 0,
  uploadStatus: '',
  selectedStyle: 'minimal',
  budget: 50,
  furnishingDensity: 50,
  lightingIntensity: 70,
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setSelectedStyle: (selectedStyle) => set({ selectedStyle }),
  setBudget: (budget) => set({ budget }),
  setFurnishingDensity: (furnishingDensity) => set({ furnishingDensity }),
  setLightingIntensity: (lightingIntensity) => set({ lightingIntensity }),
}));
