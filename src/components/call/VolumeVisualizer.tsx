"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VolumeVisualizerProps {
  stream?: MediaStream;
  isActive?: boolean;
  className?: string;
  barCount?: number;
}

export function VolumeVisualizer({
  stream,
  isActive = true,
  className,
  barCount = 5,
}: VolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!stream || !isActive || !canvasRef.current) return;

    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      setVolume(average);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const gap = 2;
      const actualBarWidth = barWidth - gap;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];
        const percent = value / 255;
        const barHeight = percent * canvas.height;

        const x = i * barWidth + gap / 2;
        const y = canvas.height - barHeight;

        // Gradient based on volume
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "oklch(0.672 0.200 268 / 0.3)");
        gradient.addColorStop(1, `oklch(0.672 0.200 268 / ${0.5 + percent * 0.5})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream, isActive, barCount]);

  if (!isActive) {
    return (
      <div className={cn("flex items-end gap-0.5 h-4", className)}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-white/10 rounded-full"
            style={{ height: "20%" }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 6}
      height={16}
      className={cn("h-4 w-auto", className)}
    />
  );
}

export function VolumeIndicator({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  const bars = 4;
  const activeBars = Math.ceil((level / 100) * bars);

  return (
    <div className={cn("flex items-end gap-[2px] h-3", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-100",
            i < activeBars
              ? "bg-emerald-400"
              : "bg-white/20"
          )}
          style={{
            height: `${((i + 1) / bars) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
