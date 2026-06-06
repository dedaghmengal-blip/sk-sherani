import React, { useRef, useEffect } from 'react';
import { MatchState } from '../types';

interface MilestoneConfettiProps {
  matchState: MatchState | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  gravity: number;
  type: 'confetti' | 'spark';
  rotation?: number;
  rotationSpeed?: number;
}

export default function MilestoneConfetti({ matchState }: MilestoneConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Keep track of old state to detect milestone triggers
  const prevStateRef = useRef<{
    runs: number;
    wickets: number;
    batsmenStats: Record<string, number>;
  }>({ runs: 0, wickets: 0, batsmenStats: {} });

  const colors = [
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // blue
    '#ef4444', // red
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#ffff00', // yellow
  ];

  // Helper to create confetti explosion (for Sixers / Boundaries / Hundreds)
  const burstConfetti = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10, // Shoot from the bottom
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 20 - 10, // Shoot updwards
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 4 + 4,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01,
        gravity: 0.35,
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  };

  // Helper to trigger firework explosion (for Wickets / Half Century Milestones)
  const burstFireworks = (x: number, y: number, colorPreset?: string[]) => {
    const explosionColors = colorPreset || colors;
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: explosionColors[Math.floor(Math.random() * explosionColors.length)],
        radius: Math.random() * 2 + 2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.012,
        gravity: 0.15,
        type: 'spark',
      });
    }
  };

  // Detect and burst!
  useEffect(() => {
    if (!matchState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentRuns = matchState.runs;
    const currentWickets = matchState.wickets;

    // Compile current batsmen stats
    const currentBatsmen: Record<string, number> = {};
    matchState.teamA.squad.forEach(p => { currentBatsmen[p.name] = p.runsScored; });
    matchState.teamB.squad.forEach(p => { currentBatsmen[p.name] = p.runsScored; });

    const prev = prevStateRef.current;

    // Detect milestones
    let triggered = false;

    // 1. Wicket fell -> Blue/Amber Fireworks!
    if (currentWickets > prev.wickets && prev.wickets > 0) {
      // Trigger center banner fireworks
      burstFireworks(canvas.width / 2, canvas.height * 0.4, ['#ef4444', '#f59e0b', '#ffffff']);
      triggered = true;
    }

    // 2. Batting Milestone (Half-century or Century)
    for (const [name, runs] of Object.entries(currentBatsmen)) {
      const prevRuns = prev.batsmenStats[name] || 0;
      if (prevRuns < 50 && runs >= 50) {
        // Fifty milestone celebrate! Massive fireworks burst!
        burstFireworks(canvas.width * 0.3, canvas.height * 0.5, ['#10b981', '#ffff00', '#ffffff']);
        burstFireworks(canvas.width * 0.7, canvas.height * 0.5, ['#10b981', '#ffff00', '#ffffff']);
        triggered = true;
      } else if (prevRuns < 100 && runs >= 100) {
        // Century milestone celebrate! Double confetti shower!
        burstConfetti(150);
        burstFireworks(canvas.width * 0.5, canvas.height * 0.4, ['#f59e0b', '#ffffff', '#ec4899']);
        triggered = true;
      }
    }

    // 3. Sixer hit trigger check
    const runIncrease = currentRuns - prev.runs;
    if (runIncrease === 6 && currentWickets === prev.wickets && prev.runs > 0) {
      // Smashed a Sixer! Scatter flying confetti stream from below!
      burstConfetti(80);
      burstFireworks(canvas.width / 2, canvas.height * 0.3, ['#ffff00', '#f59e0b', '#3b82f6']);
      triggered = true;
    } else if (runIncrease === 4 && currentWickets === prev.wickets && prev.runs > 0) {
      // Smashed a Four! Minor explosion!
      burstConfetti(40);
      triggered = true;
    }

    // Save previous state
    prevStateRef.current = {
      runs: currentRuns,
      wickets: currentWickets,
      batsmenStats: currentBatsmen,
    };
  }, [matchState]);

  // Main canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to cover viewport
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'confetti') {
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.05);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Rectangular confetti
          ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
        } else {
          // Circular firework sparks
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(updateParticles);
    };

    updateParticles();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-full h-full"
      style={{ mixBlendMode: 'screen' }}
      id="milestone-celebration-canvas"
    />
  );
}
