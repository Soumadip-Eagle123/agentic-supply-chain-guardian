'use client';
import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function NeuralMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  
  const isDashboard = pathname.includes('/shipment') || pathname.includes('/warehouse');

  useEffect(() => {
    if (!isDashboard || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const particleCount = 60;

    class Particle {
      x: number; y: number; vx: number; vy: number;
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'; // blue-500 with low opacity
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener('resize', init);
    return () => window.removeEventListener('resize', init);
  }, [isDashboard]);

  if (!isDashboard) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 -z-5 pointer-events-none transition-opacity duration-1000"
    />
  );
}