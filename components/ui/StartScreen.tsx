'use client';

import { useGameStore } from '@/lib/store';

const F = 'var(--font-game)';

export function StartScreen({ isMapVisible = false }: { isMapVisible?: boolean }) {
  const startGame = useGameStore((s) => s.startGame);
  const stopClickThrough = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center transition-colors duration-700"
      onPointerDown={stopClickThrough}
      onClick={stopClickThrough}
      style={{ background: isMapVisible ? 'rgba(0,0,0,0.66)' : 'rgba(0,0,0,0.92)' }}
    >
      {/* Title */}
      <h1
        className="anim-slideUp d1 text-center uppercase"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(80px, 14vw, 160px)',
          lineHeight: 0.88,
          color: '#fff',
        }}
      >
        FJODOR&apos;S<br />DEFENSE
      </h1>

      {/* Location */}
      <p
        className="anim-fadeIn d2 uppercase"
        style={{
          fontFamily: F,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '0.2em',
          color: '#aaa',
          marginTop: 28,
        }}
      >
        Södermalm · Stockholm
      </p>

      {/* Play */}
      <button
        onPointerDown={stopClickThrough}
        onClick={(e) => {
          e.stopPropagation();
          startGame();
        }}
        className="anim-scaleIn d3 uppercase cursor-pointer"
        style={{
          marginTop: 56,
          padding: '18px 64px',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: F,
          letterSpacing: '0.12em',
          color: '#111',
          background: '#FFD666',
          border: 'none',
          borderRadius: 6,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.boxShadow = '0 0 48px rgba(255,214,102,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Play Now
      </button>

      {/* Controls */}
      <p
        className="anim-fadeIn d4"
        style={{
          marginTop: 48,
          fontFamily: F,
          fontSize: 14,
          fontWeight: 500,
          color: '#777',
        }}
      >
        Click to place · Right-drag to rotate · Scroll to zoom
      </p>
    </div>
  );
}
