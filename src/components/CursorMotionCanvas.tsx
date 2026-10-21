import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
}

export default function CursorMotionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool
    const particles: Particle[] = [];
    const maxParticles = 65;

    // Palette of subtle luxury violet, indigo, cyan, and electric blue sparkles
    const colors = [
      'rgba(99, 102, 241, ',   // Indigo
      'rgba(168, 85, 247, ',   // Violet
      'rgba(56, 189, 248, ',   // Sky
      'rgba(129, 140, 248, ',  // Soft Blue
      'rgba(236, 72, 153, '    // Subtle Rose
    ];

    // Mouse tracking with smooth lerp
    let mouseX = width / 2;
    let mouseY = height / 3;
    let targetX = mouseX;
    let targetY = mouseY;
    let lastX = mouseX;
    let lastY = mouseY;
    let isInteracting = false;

    const spawnParticles = (x: number, y: number, speed: number) => {
      const count = Math.min(Math.floor(speed * 0.4) + 1, 4);
      for (let i = 0; i < count; i++) {
        if (particles.length >= maxParticles) {
          particles.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() * 1.5 + 0.5) * (1 + Math.min(speed * 0.05, 2));
        particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: Math.random() * 2.5 + 1.2,
          alpha: Math.random() * 0.4 + 0.5,
          maxLife: Math.random() * 35 + 25,
          life: 0,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      isInteracting = true;
      let clientX: number, clientY: number;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      targetX = clientX;
      targetY = clientY;

      const dx = targetX - lastX;
      const dy = targetY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        spawnParticles(targetX, targetY, dist);
        lastX = targetX;
        lastY = targetY;
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Ambient floating constellations
    const ambientNodes: { x: number; y: number; vx: number; vy: number; baseRadius: number }[] = [];
    const nodeCount = 20;
    for (let i = 0; i < nodeCount; i++) {
      ambientNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: Math.random() * 2 + 1.5
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Lerp mouse
      mouseX += (targetX - mouseX) * 0.12;
      mouseY += (targetY - mouseY) * 0.12;

      // 1. Render soft ambient cursor backlight aura
      if (isInteracting) {
        const glowRadius = Math.min(width, height) * 0.35;
        const radialGradient = ctx.createRadialGradient(
          mouseX, mouseY, 0,
          mouseX, mouseY, glowRadius
        );
        radialGradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
        radialGradient.addColorStop(0.4, 'rgba(168, 85, 247, 0.03)');
        radialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = radialGradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render and connect ambient nodes
      for (let i = 0; i < ambientNodes.length; i++) {
        const node = ambientNodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        // Mouse magnetic repel/attract
        const mdx = node.x - mouseX;
        const mdy = node.y - mouseY;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 160 && mDist > 0) {
          const force = (160 - mDist) / 160;
          node.x += (mdx / mDist) * force * 1.5;
          node.y += (mdy / mDist) * force * 1.5;
        }

        ctx.fillStyle = 'rgba(147, 130, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < ambientNodes.length; j++) {
          const other = ambientNodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const dist = Math.sqrt(ndx * ndx + ndy * ndy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(165, 150, 255, ${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      }

      // 3. Render dynamic motion particle stream behind cursor
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        const currentAlpha = p.alpha * (1 - progress);
        ctx.fillStyle = `${p.color}${currentAlpha})`;
        ctx.shadowColor = `${p.color}0.8)`;
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    />
  );
}
