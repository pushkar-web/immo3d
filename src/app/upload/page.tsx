'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Upload,
  FileUp,
  X,
  Check,
  Loader2,
  Wand2,
  SlidersHorizontal,
  Sun,
  Sofa,
  DollarSign,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  FileCode,
} from 'lucide-react';
import { DESIGN_STYLES } from '@/lib/building-data';
import type { DesignStyle } from '@/types';

const acceptedTypes: Record<string, { icon: typeof FileText; label: string; ext: string[] }> = {
  pdf: { icon: FileText, label: 'PDF', ext: ['.pdf'] },
  image: { icon: ImageIcon, label: 'JPG / PNG', ext: ['.jpg', '.jpeg', '.png'] },
  cad: { icon: FileCode, label: 'DXF / DWG', ext: ['.dxf', '.dwg'] },
  svg: { icon: FileCode, label: 'SVG', ext: ['.svg'] },
};

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'upload' | 'style' | 'generating'>('upload');
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>('minimal');
  const [budget, setBudget] = useState(50);
  const [furnishing, setFurnishing] = useState(60);
  const [lighting, setLighting] = useState(70);
  const [projectName, setProjectName] = useState('');
  const [buildingType, setBuildingType] = useState<'tower' | 'villa' | 'apartment' | 'commercial'>('apartment');
  const [floors, setFloors] = useState(3);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  async function handleGenerate() {
    setStep('generating');
    setProgress(0);
    setStatusMsg('Preparing...');

    try {
      // Animate progress stages while the request is processing
      const stages = [
        { delay: 0, progress: 5, msg: 'Uploading floor plan...' },
        { delay: 1200, progress: 25, msg: 'AI parsing layout — detecting rooms, walls, doors...' },
        { delay: 2800, progress: 50, msg: 'Generating 3D model — extruding walls...' },
        { delay: 4200, progress: 65, msg: 'Placing furniture and fixtures...' },
        { delay: 5500, progress: 80, msg: 'Applying materials and lighting...' },
      ];
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (const stage of stages) {
        timers.push(setTimeout(() => {
          setProgress(stage.progress);
          setStatusMsg(stage.msg);
        }, stage.delay));
      }

      // Build FormData with file + metadata in a single request
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('name', projectName || `My ${buildingType}`);
      formData.append('description', `${floors}-floor ${buildingType} in ${selectedStyle} style`);
      formData.append('buildingType', buildingType);
      formData.append('floors', String(floors));
      formData.append('style', selectedStyle);

      const res = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      // Clear animation timers
      timers.forEach(clearTimeout);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }

      const project = await res.json();

      setProgress(100);
      setStatusMsg('Ready! Redirecting...');
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/project/${project.id}`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Error generating project. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-bold mb-2 text-slate-900">
              Create a New <span className="gradient-text">3D Project</span>
            </h1>
            <p className="text-slate-500">Upload your building layout and customize the design</p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[
              { id: 'upload', label: 'Upload' },
              { id: 'style', label: 'Customize' },
              { id: 'generating', label: 'Generate' },
            ].map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s.id
                      ? 'bg-primary-500 text-white'
                      : ['upload', 'style', 'generating'].indexOf(step) > idx
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {['upload', 'style', 'generating'].indexOf(step) > idx ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-sm ${step === s.id ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {idx < 2 && <div className="w-12 h-px bg-slate-200 mx-2" />}
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Sunset Tower"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Building Type</label>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value as typeof buildingType)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none appearance-none"
                  >
                    <option value="tower">Tower</option>
                    <option value="villa">Villa</option>
                    <option value="apartment">Apartment Complex</option>
                    <option value="commercial">Commercial Building</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Floors: <span className="text-primary-600 font-bold">{floors}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={floors}
                  onChange={(e) => setFloors(parseInt(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-primary-400 bg-primary-50'
                    : file
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.dxf,.dwg,.svg"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="font-medium text-emerald-700">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-3 text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 mx-auto"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
                      <FileUp className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700">
                      Drag & drop your floor plan here
                    </p>
                    <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                      {Object.values(acceptedTypes).map((t) => (
                        <span
                          key={t.label}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-500"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep('style')}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-400 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Choose Style
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Style & Budget */}
          {step === 'style' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
                  <Wand2 className="w-5 h-5 text-primary-500" />
                  Design Style
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DESIGN_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        selectedStyle === style.id
                          ? 'bg-primary-50 border-2 border-primary-500 ring-1 ring-primary-500/30'
                          : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-1.5 mb-3">
                        {Object.values(style.colors).map((color, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full border border-slate-200"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <h4 className="font-medium text-sm text-slate-900">{style.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                  <SlidersHorizontal className="w-5 h-5 text-primary-500" />
                  Preferences
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-accent-500" />
                      Budget Level
                    </label>
                    <span className="text-sm font-medium text-primary-600">{budget}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={budget} onChange={(e) => setBudget(parseInt(e.target.value))} className="w-full accent-primary-500" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Economy</span><span>Premium</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-600 flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      Lighting Intensity
                    </label>
                    <span className="text-sm font-medium text-primary-600">{lighting}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={lighting} onChange={(e) => setLighting(parseInt(e.target.value))} className="w-full accent-primary-500" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-600 flex items-center gap-2">
                      <Sofa className="w-4 h-4 text-violet-500" />
                      Furnishing Density
                    </label>
                    <span className="text-sm font-medium text-primary-600">{furnishing}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={furnishing} onChange={(e) => setFurnishing(parseInt(e.target.value))} className="w-full accent-primary-500" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Sparse</span><span>Fully Furnished</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-6 py-4 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold hover:from-accent-400 hover:to-accent-500 transition-all shadow-lg shadow-accent-500/20"
                >
                  <Wand2 className="w-5 h-5" />
                  Generate 3D Model
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-8 relative">
                <div className="absolute inset-0 rounded-2xl bg-primary-100 animate-pulse" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary-500 spinner" />
                </div>
              </div>

              <h2 className="text-2xl font-display font-bold mb-2 text-slate-900">
                {progress < 100 ? 'Generating Your Building' : 'Complete!'}
              </h2>
              <p className="text-slate-500 mb-8">{statusMsg}</p>

              <div className="max-w-md mx-auto">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>{progress}%</span>
                  <span>Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
