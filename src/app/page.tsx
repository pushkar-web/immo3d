'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useInView } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Upload,
  Box,
  Eye,
  Download,
  Sparkles,
  Layers,
  Camera,
  Wand2,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Play,
} from 'lucide-react';

const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false });

/* ── Data ──────────────────────────────────────────────────────────────── */

const features = [
  {
    icon: Upload,
    title: 'Upload Any Layout',
    description: 'Support for PDF, JPG/PNG, DXF, and SVG floor plans. Our AI parses walls, rooms, doors, and windows automatically.',
  },
  {
    icon: Box,
    title: '3D Model Generation',
    description: 'Automatic extrusion of walls, floors, ceilings. Pre-placed furniture and fixtures based on room types.',
  },
  {
    icon: Eye,
    title: 'Immersive Walkthrough',
    description: 'First-person navigation with WASD controls. Fly-through mode, room focus, day/night toggle.',
  },
  {
    icon: Sparkles,
    title: 'AI Design Assistant',
    description: 'RAG-powered agents suggest styles, optimize layouts, and generate marketing descriptions.',
  },
  {
    icon: Download,
    title: 'Export Everything',
    description: 'Download GLB/GLTF, OBJ/FBX models. Generate 360° panoramas and MP4 fly-through videos.',
  },
  {
    icon: Layers,
    title: 'Multi-Floor Support',
    description: 'Navigate floor-by-floor through towers, villas, and apartment complexes with ease.',
  },
];

const steps = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload Your Floor Plan',
    description: 'Drag & drop your building layout in any format — PDF, image, CAD, or SVG.',
  },
  {
    step: '02',
    icon: Wand2,
    title: 'AI Parses & Generates',
    description: 'Our pipeline detects rooms, walls, doors, and windows, then builds a full 3D model.',
  },
  {
    step: '03',
    icon: Camera,
    title: 'Explore in 3D',
    description: 'Walk through your building in the browser. Switch styles, toggle furniture, change lighting.',
  },
  {
    step: '04',
    icon: Download,
    title: 'Export & Share',
    description: 'Download 3D models, 360° images, and fly-through videos. Share via link or embed.',
  },
];

const stats = [
  { value: '10K+', label: 'Buildings Generated' },
  { value: '50+', label: 'Design Styles' },
  { value: '< 60s', label: 'Generation Time' },
  { value: '4.9★', label: 'User Rating' },
];

/* ── Animation helpers ─────────────────────────────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function StaggeredCard({
  children,
  index,
  className = '',
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const scrollRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = total > 0 ? window.scrollY / total : 0;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
        <Navbar transparent />

        {/* Fixed 3D Background */}
        <div className="fixed inset-0 z-0">
          <HeroScene scrollRef={scrollRef} />
        </div>

        {/* Scrollable content overlay */}
        <div className="relative z-10">

          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center">
            <motion.div
              className="text-center max-w-3xl mx-auto px-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-teal-300 text-sm font-medium mb-6 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3, ease }}
              >
                <Sparkles className="w-4 h-4" />
                AI-Powered 3D Real Estate Platform
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
                Transform Floor Plans
                <br />
                <span className="gradient-text">Into 3D Worlds</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed">
                Upload any building layout and get a fully furnished, interactive 3D model
                in seconds. Walk through, customize, and export — all in your browser.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/upload"
                  className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold text-lg hover:from-teal-400 hover:to-teal-500 transition-all shadow-xl shadow-teal-500/25"
                >
                  <Upload className="w-5 h-5" />
                  Upload Layout
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-lg hover:bg-white/15 hover:border-white/30 transition-all backdrop-blur-sm"
                >
                  <Play className="w-5 h-5 text-teal-400" />
                  View Demo Projects
                </Link>
              </div>

              {/* Mini stats */}
              <div className="flex items-center justify-center gap-8 mt-6">
                {[
                  { val: '10K+', label: 'Buildings' },
                  { val: '< 60s', label: 'Generation' },
                  { val: '4.9★', label: 'Rating' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-bold text-teal-400">{s.val}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 animate-bounce-slow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-white/40 font-medium tracking-wider uppercase">Scroll</span>
                <ChevronDown className="w-5 h-5 text-white/40" />
              </div>
            </motion.div>
          </section>

          {/* Stats Bar */}
          <AnimatedSection className="py-12 border-y border-white/10 bg-white/[0.03] backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                  <StaggeredCard key={stat.label} index={i} className="text-center">
                    <div className="text-3xl font-display font-bold text-teal-400 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-400">{stat.label}</div>
                  </StaggeredCard>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Features Grid */}
          <AnimatedSection className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Everything You Need to
                  <span className="gradient-text"> Visualize Real Estate</span>
                </h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                  From layout parsing to 3D walkthroughs, our platform handles the entire pipeline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, i) => (
                  <StaggeredCard
                    key={feature.title}
                    index={i}
                    className="group p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-teal-500/30 hover:bg-white/[0.08] transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:bg-teal-500/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                  </StaggeredCard>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Glow divider */}
          <div className="glow-line mx-auto max-w-2xl" />

          {/* How It Works */}
          <AnimatedSection className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  How It <span className="gradient-text">Works</span>
                </h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                  Four simple steps to transform any floor plan into an immersive 3D experience.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {steps.map((item, idx) => (
                  <StaggeredCard key={item.step} index={idx} className="relative">
                    {idx < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-12 left-full w-full">
                        <ChevronRight className="w-6 h-6 text-slate-600 -ml-3" />
                      </div>
                    )}
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-2xl bg-white/[0.05] border border-white/10" />
                        <div className="relative w-full h-full flex items-center justify-center">
                          <item.icon className="w-10 h-10 text-teal-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-orange-500/30">
                          {item.step}
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                  </StaggeredCard>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* CTA Section */}
          <AnimatedSection className="py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="p-12 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-white">
                    Ready to Build in 3D?
                  </h2>
                  <p className="text-teal-100 mb-8 max-w-lg mx-auto">
                    Upload your first floor plan and see the result in under a minute.
                    No credit card required.
                  </p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-teal-700 font-semibold text-lg hover:bg-teal-50 transition-all shadow-xl"
                  >
                    <Upload className="w-5 h-5" />
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Footer (dark-adapted) */}
          <div className="bg-[#0a0f1a]/80 backdrop-blur-sm border-t border-white/10">
            <Footer />
          </div>
        </div>
      </div>
  );
}
