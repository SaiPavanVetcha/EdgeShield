import { useState, useEffect, useCallback } from 'react';
import type { SlideData } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LightboxModal } from './components/LightboxModal';
import { KeyboardModal } from './components/KeyboardModal';

// 7 Modular Slides
import { Slide1Hero } from './slides/Slide1Hero';
import { Slide2Problem } from './slides/Slide2Problem';
import { Slide3Solution } from './slides/Slide3Solution';
import { Slide4Workflow } from './slides/Slide4Workflow';
import { Slide5GoldLayer } from './slides/Slide5GoldLayer';
import { Slide6Roadmap } from './slides/Slide6Roadmap';
import { Slide7Closing } from './slides/Slide7Closing';

const SLIDES: SlideData[] = [
  { id: 1, title: 'EdgeShield', subtitle: 'Edge to Lakehouse', category: 'Overview' },
  { id: 2, title: 'The Problem', subtitle: 'Observability Gaps', category: 'Challenge' },
  { id: 3, title: 'Solution Architecture', subtitle: '4 Core Pillars', category: 'Architecture' },
  { id: 4, title: 'Complete Workflow', subtitle: 'End-to-End Pipeline', category: 'Pipeline' },
  { id: 5, title: 'Gold Layer Star Schema', subtitle: 'Data Modeling & ML', category: 'Data Model' },
  { id: 6, title: 'Version Roadmap', subtitle: 'V1 → V2 → V3', category: 'Roadmap' },
  { id: 7, title: 'Summary & Closing', subtitle: 'EdgeShield', category: 'Conclusion' },
];

export function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; src: string; title: string }>({
    isOpen: false,
    src: '',
    title: '',
  });
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);

  // Slide navigation handlers
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, SLIDES.length - 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < SLIDES.length) {
      setCurrentSlide(index);
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Sync fullscreen change from browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (lightboxState.isOpen) {
          setLightboxState({ isOpen: false, src: '', title: '' });
          return;
        }
        if (isKeyboardModalOpen) {
          setIsKeyboardModalOpen(false);
          return;
        }
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsKeyboardModalOpen(prev => !prev);
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      // Next slide: ArrowRight, Space, PageDown
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      }

      // Prev slide: ArrowLeft, Backspace, PageUp
      if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      }

      // Numeric jump: 1 to 7
      if (e.key >= '1' && e.key <= '7') {
        const targetIndex = parseInt(e.key, 10) - 1;
        goToSlide(targetIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, goToSlide, toggleFullscreen, lightboxState.isOpen, isKeyboardModalOpen]);

  // Lightbox opener
  const handleOpenLightbox = (src: string, title: string) => {
    setLightboxState({ isOpen: true, src, title });
  };

  return (
    <div className="relative w-screen h-screen bg-space-950 text-slate-100 flex flex-col justify-between overflow-hidden bg-grid-pattern">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Header */}
      <Header
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        slides={SLIDES}
        onSelectSlide={goToSlide}
        onOpenKeyboardHelp={() => setIsKeyboardModalOpen(true)}
      />

      {/* Main Slide Presentation Stage */}
      <main className="relative flex-1 w-full pt-20 pb-20 overflow-y-auto overflow-x-hidden flex items-center justify-center">
        <div key={currentSlide} className="w-full slide-enter my-auto py-1">
          {currentSlide === 0 && <Slide1Hero onNext={nextSlide} />}
          {currentSlide === 1 && <Slide2Problem />}
          {currentSlide === 2 && <Slide3Solution />}
          {currentSlide === 3 && <Slide4Workflow onOpenLightbox={handleOpenLightbox} />}
          {currentSlide === 4 && <Slide5GoldLayer />}
          {currentSlide === 5 && <Slide6Roadmap />}
          {currentSlide === 6 && <Slide7Closing onRestart={() => goToSlide(0)} />}
        </div>
      </main>

      {/* Bottom Progress & Slide Controls */}
      <Navigation
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        slides={SLIDES}
        onPrev={prevSlide}
        onNext={nextSlide}
        onSelectSlide={goToSlide}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Lightbox for workflow diagram inspection */}
      <LightboxModal
        isOpen={lightboxState.isOpen}
        src={lightboxState.src}
        title={lightboxState.title}
        onClose={() => setLightboxState({ isOpen: false, src: '', title: '' })}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
      />
    </div>
  );
}

export default App;
