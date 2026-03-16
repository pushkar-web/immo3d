import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-display font-bold">
                <span className="text-teal-400">Immo</span>
                <span className="text-orange-400">3D</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered 3D real estate visualization platform. Transform floor plans into
              immersive 3D experiences.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Product</h4>
            <ul className="space-y-2">
              {['Features', 'Pricing', 'Documentation', 'API'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Company</h4>
            <ul className="space-y-2">
              {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Legal</h4>
            <ul className="space-y-2">
              {['Privacy', 'Terms', 'Security'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; 2026 Immo3D. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">Built with Next.js + Three.js + Groq AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
