import { useState, useEffect, useRef } from 'react';

export function useMicrophoneWaveform(isListening: boolean) {
  const [levels, setLevels] = useState<number[]>(new Array(5).fill(4));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateWaveform = () => {
          if (!isMounted || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Sample a few frequencies to create a visual pulse
          const newLevels = [
            Math.max(4, (dataArray[2] / 255) * 24),
            Math.max(4, (dataArray[4] / 255) * 24),
            Math.max(4, (dataArray[6] / 255) * 24),
            Math.max(4, (dataArray[8] / 255) * 24),
            Math.max(4, (dataArray[10] / 255) * 24),
          ];
          
          setLevels(newLevels);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };

        updateWaveform();
      } catch (err) {
        console.error("Microphone access error for waveform:", err);
      }
    }

    if (isListening) {
      startAudio();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      setLevels(new Array(5).fill(4));
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(console.error);
    };
  }, [isListening]);

  return levels;
}
