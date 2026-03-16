'use client';

import { useState } from 'react';
import {
  X,
  Download,
  Box,
  Image,
  Video,
  Link2,
  Code2,
  Copy,
  Check,
  Loader2,
  FileBox,
} from 'lucide-react';

interface ExportModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const exportOptions = [
  {
    category: '3D Models',
    items: [
      { format: 'glb', label: 'GLB (Binary GLTF)', description: 'Web, AR, Unity/Unreal', icon: Box, size: '~12 MB' },
      { format: 'gltf', label: 'GLTF + Textures', description: 'Standard 3D interchange', icon: FileBox, size: '~18 MB' },
      { format: 'obj', label: 'OBJ + MTL', description: 'Universal 3D format', icon: Box, size: '~15 MB' },
      { format: 'fbx', label: 'FBX', description: 'Autodesk / game engines', icon: Box, size: '~20 MB' },
    ],
  },
  {
    category: 'Media',
    items: [
      { format: '360', label: '360° Panorama Images', description: 'One per room, 4K resolution', icon: Image, size: '~50 MB' },
      { format: 'mp4', label: 'MP4 Fly-Through Video', description: '1080p, 60 seconds', icon: Video, size: '~80 MB' },
    ],
  },
];

export default function ExportModal({ projectId, projectName, onClose }: ExportModalProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/project/${projectId}/preview`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  async function handleExport(format: string) {
    setExporting(format);
    // Simulate export
    await new Promise((r) => setTimeout(r, 2000));
    setCompleted((prev) => new Set(prev).add(format));
    setExporting(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-400" />
              Export & Share
            </h2>
            <p className="text-sm text-gray-400">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Options */}
          {exportOptions.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.format}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">
                          {item.description} · {item.size}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(item.format)}
                      disabled={exporting !== null}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        completed.has(item.format)
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : exporting === item.format
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'bg-primary-600 text-white hover:bg-primary-500'
                      } disabled:opacity-50`}
                    >
                      {completed.has(item.format) ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Done
                        </span>
                      ) : exporting === item.format ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 spinner" /> Exporting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Download className="w-4 h-4" /> Export
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Sharing */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Sharing
            </h3>
            <div className="space-y-3">
              {/* Public link */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium">Public Link</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
                    className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Embed code */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium">Embed Code</span>
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
                    {embedCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(embedCode)}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
