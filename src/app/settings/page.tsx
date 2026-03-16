'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Settings,
  User,
  Ruler,
  Palette,
  Globe,
  Bell,
  Save,
  Check,
} from 'lucide-react';
import type { DesignStyle } from '@/types';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [language, setLanguage] = useState('en');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [defaultStyle, setDefaultStyle] = useState<DesignStyle>('minimal');
  const [notifications, setNotifications] = useState(true);
  const [highQuality, setHighQuality] = useState(true);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500">User preferences and defaults</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile */}
            <section className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-primary-500" />
                Profile
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    defaultValue="Demo User"
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue="demo@immo3d.com"
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Preferences */}
            <section className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
                <Palette className="w-5 h-5 text-primary-500" />
                Preferences
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Default Design Style</label>
                  <select
                    value={defaultStyle}
                    onChange={(e) => setDefaultStyle(e.target.value as DesignStyle)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:outline-none appearance-none"
                  >
                    <option value="minimal">Minimal Modern</option>
                    <option value="scandinavian">Scandinavian</option>
                    <option value="tropical">Indian Tropical</option>
                    <option value="luxury">Luxury Modern</option>
                    <option value="industrial">Industrial Loft</option>
                    <option value="classic">Classic Elegant</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-slate-700 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Language
                    </label>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:border-primary-500 focus:outline-none appearance-none"
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Fran&ccedil;ais</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-700 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Measurement Units
                  </label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                    <button
                      onClick={() => setUnits('metric')}
                      className={`px-3 py-1.5 text-sm ${
                        units === 'metric'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Metric
                    </button>
                    <button
                      onClick={() => setUnits('imperial')}
                      className={`px-3 py-1.5 text-sm ${
                        units === 'imperial'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Imperial
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Rendering */}
            <section className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Rendering</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">High Quality Rendering</p>
                    <p className="text-xs text-slate-400">Shadows, reflections, post-processing</p>
                  </div>
                  <button
                    onClick={() => setHighQuality(!highQuality)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      highQuality ? 'bg-primary-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        highQuality ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">Notifications</p>
                    <p className="text-xs text-slate-400">Generation complete, export ready</p>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      notifications ? 'bg-primary-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        notifications ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors"
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
