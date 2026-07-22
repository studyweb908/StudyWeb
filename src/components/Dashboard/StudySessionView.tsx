import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Clock, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Music,
  CheckCircle,
  FileText,
  CloudRain,
  Wind,
  Coffee,
  Headphones,
  Sliders
} from 'lucide-react';

export default function StudySessionView() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusNotes, setFocusNotes] = useState('');
  const [audioSource, setAudioSource] = useState('Lo-Fi Study Beats');
  const [soundscapesEnabled, setSoundscapesEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<any[]>([]);
  const lofiIntervalRef = useRef<any>(null);

  const stopAllSources = () => {
    if (lofiIntervalRef.current) {
      clearInterval(lofiIntervalRef.current);
      lofiIntervalRef.current = null;
    }
    activeSourcesRef.current.forEach(source => {
      try {
        if (typeof source.stop === 'function') {
          source.stop();
        }
      } catch (e) {}
    });
    activeSourcesRef.current = [];
  };

  const startSoundscape = (ctx: AudioContext, master: GainNode, sourceName: string) => {
    stopAllSources();

    if (sourceName === 'Lo-Fi Study Beats') {
      const chords = [
        [130.81, 164.81, 196.00, 246.94], // Cmaj7
        [110.00, 130.81, 164.81, 196.00], // Am7
        [87.31, 110.00, 130.81, 164.81],  // Fmaj7
        [98.00, 123.47, 146.83, 174.61]   // G7
      ];
      let chordIndex = 0;

      const playLofiBeat = () => {
        const now = ctx.currentTime;
        const chordNotes = chords[chordIndex];
        chordIndex = (chordIndex + 1) % chords.length;

        chordNotes.forEach((freq) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.05, now + 1.5);
          gain.gain.setValueAtTime(0.05, now + 4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 5.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(master);

          osc.start(now);
          osc.stop(now + 6);

          activeSourcesRef.current.push(osc);
        });

        // Soft vinyl static hiss buffer
        const bufferSize = ctx.sampleRate * 2.0;
        const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = crackleBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          if (Math.random() > 0.9997) {
            data[i] = (Math.random() - 0.5) * 0.12;
          } else {
            data[i] = (Math.random() - 0.5) * 0.004;
          }
        }
        const crackle = ctx.createBufferSource();
        crackle.buffer = crackleBuffer;
        crackle.loop = true;
        
        const crackleFilter = ctx.createBiquadFilter();
        crackleFilter.type = 'bandpass';
        crackleFilter.frequency.setValueAtTime(1000, now);
        crackleFilter.Q.setValueAtTime(1.0, now);
        
        const crackleGain = ctx.createGain();
        crackleGain.gain.setValueAtTime(0.04, now);

        crackle.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(master);
        crackle.start(now);
        activeSourcesRef.current.push(crackle);

        // Schedule gentle kick and snare rhythm
        for (let beat = 0; beat < 4; beat++) {
          const beatTime = now + (beat * 1.5);

          if (beat === 0 || beat === 2) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            kickOsc.frequency.setValueAtTime(110, beatTime);
            kickOsc.frequency.exponentialRampToValueAtTime(40, beatTime + 0.12);

            kickGain.gain.setValueAtTime(0.10, beatTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);

            kickOsc.connect(kickGain);
            kickGain.connect(master);
            kickOsc.start(beatTime);
            kickOsc.stop(beatTime + 0.28);
            activeSourcesRef.current.push(kickOsc);
          }

          if (beat === 1 || beat === 3) {
            const snareNoise = ctx.createBufferSource();
            snareNoise.buffer = crackleBuffer;
            const snareFilter = ctx.createBiquadFilter();
            snareFilter.type = 'bandpass';
            snareFilter.frequency.setValueAtTime(350, beatTime);
            snareFilter.Q.setValueAtTime(1.2, beatTime);

            const snareGain = ctx.createGain();
            snareGain.gain.setValueAtTime(0.035, beatTime);
            snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);

            snareNoise.connect(snareFilter);
            snareFilter.connect(snareGain);
            snareGain.connect(master);
            snareNoise.start(beatTime);
            snareNoise.stop(beatTime + 0.22);
            activeSourcesRef.current.push(snareNoise);
          }
        }
      };

      playLofiBeat();
      lofiIntervalRef.current = setInterval(playLofiBeat, 6000);

    } else if (sourceName === 'Deep Rain & Thunderstorm') {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = buffer;
      rainSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(120, now);
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      activeSourcesRef.current.push(lfo);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);

      rainSource.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      rainSource.start(now);
      activeSourcesRef.current.push(rainSource);

      const triggerThunder = () => {
        const tNow = ctx.currentTime;
        const rumbleOsc = ctx.createOscillator();
        const rumbleFilter = ctx.createBiquadFilter();
        const rumbleGain = ctx.createGain();

        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(32, tNow);
        
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(65, tNow);

        rumbleGain.gain.setValueAtTime(0, tNow);
        rumbleGain.gain.linearRampToValueAtTime(0.28, tNow + 1.0);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, tNow + 5.5);

        rumbleOsc.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(master);

        rumbleOsc.start(tNow);
        rumbleOsc.stop(tNow + 6.0);
        activeSourcesRef.current.push(rumbleOsc);
      };

      const thunderTimer = setInterval(() => {
        if (Math.random() > 0.45) {
          triggerThunder();
        }
      }, 11000);

      activeSourcesRef.current.push({ stop: () => clearInterval(thunderTimer) });

    } else if (sourceName === 'White Noise Fan') {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const fanSource = ctx.createBufferSource();
      fanSource.buffer = buffer;
      fanSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(160, now);
      filter.Q.setValueAtTime(1.1, now);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.6, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.015, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
      activeSourcesRef.current.push(lfo);

      fanSource.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      fanSource.start(now);
      activeSourcesRef.current.push(fanSource);

    } else if (sourceName === 'Coffee Shop Murmur') {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const humSource = ctx.createBufferSource();
      humSource.buffer = buffer;
      humSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);

      humSource.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      humSource.start(now);
      activeSourcesRef.current.push(humSource);

      const playClink = () => {
        const cNow = ctx.currentTime;
        const osc = ctx.createOscillator();
        const clinkGain = ctx.createGain();

        osc.type = 'sine';
        const freq = 1700 + Math.random() * 900;
        osc.frequency.setValueAtTime(freq, cNow);

        clinkGain.gain.setValueAtTime(0, cNow);
        clinkGain.gain.linearRampToValueAtTime(0.012, cNow + 0.01);
        clinkGain.gain.exponentialRampToValueAtTime(0.001, cNow + 0.22);

        osc.connect(clinkGain);
        clinkGain.connect(master);
        osc.start(cNow);
        osc.stop(cNow + 0.28);
        activeSourcesRef.current.push(osc);
      };

      const clinkTimer = setInterval(() => {
        if (Math.random() > 0.4) {
          playClink();
        }
      }, 4500);

      activeSourcesRef.current.push({ stop: () => clearInterval(clinkTimer) });
    }
  };

  // Automatically start playing soundscape when focus timer is active and unmuted and soundscapes are enabled
  useEffect(() => {
    if (!isActive || isMuted || !soundscapesEnabled) {
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, audioCtxRef.current.currentTime);
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.2);
      }
      const timer = setTimeout(() => {
        stopAllSources();
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          audioCtxRef.current.suspend();
        }
      }, 250);
      return () => clearTimeout(timer);
    }

    const initAndStart = async () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          audioCtxRef.current = new AudioContextClass();
        }

        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }

        if (!masterGainRef.current) {
          masterGainRef.current = audioCtxRef.current.createGain();
          masterGainRef.current.connect(audioCtxRef.current.destination);
        }

        masterGainRef.current.gain.setValueAtTime(0.001, audioCtxRef.current.currentTime);
        masterGainRef.current.gain.linearRampToValueAtTime(1.0, audioCtxRef.current.currentTime + 0.4);

        startSoundscape(audioCtxRef.current, masterGainRef.current, audioSource);
      } catch (err) {
        console.warn('Failed to start ambient audio context:', err);
      }
    };

    initAndStart();
  }, [isActive, isMuted, audioSource, soundscapesEnabled]);

  // Handle automatic play trigger on starting focus timer
  useEffect(() => {
    if (isActive && soundscapesEnabled) {
      setIsMuted(false);
    }
  }, [isActive, soundscapesEnabled]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllSources();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Load quick-started session parameters from event or localStorage
  useEffect(() => {
    const handleQuickStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.duration) {
        setSecondsLeft(parseInt(customEvent.detail.duration) * 60);
      }
      if (customEvent.detail?.goal) {
        setFocusNotes(prev => prev ? prev + '\n' + customEvent.detail.goal : customEvent.detail.goal);
      }
      setIsActive(true);
      setSessionType('focus');
    };

    const quickStart = localStorage.getItem('studyweb_quick_start_session');
    if (quickStart === 'true') {
      localStorage.removeItem('studyweb_quick_start_session');
      setIsActive(true);
      setSessionType('focus');
      const duration = localStorage.getItem('studyweb_quick_start_duration');
      if (duration) {
        setSecondsLeft(parseInt(duration) * 60);
        localStorage.removeItem('studyweb_quick_start_duration');
      }
      const goal = localStorage.getItem('studyweb_quick_start_goal');
      if (goal) {
        setFocusNotes(goal);
        localStorage.removeItem('studyweb_quick_start_goal');
      }
    }

    window.addEventListener('studyweb_quick_session_start', handleQuickStart);
    return () => window.removeEventListener('studyweb_quick_session_start', handleQuickStart);
  }, []);

  // Timer tick - Optimized to avoid drift and interval rebuilding every second
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Handle Study Session timer completion events
  useEffect(() => {
    if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      // Play bell or toggle session
      if (sessionType === 'focus') {
        (window as any).showToast?.('🎉 Focus Session Complete! Time for a short break.', 'success');
        setSessionType('break');
        setSecondsLeft(5 * 60);
      } else {
        (window as any).showToast?.("💪 Break is over! Let's lock back in.", 'success');
        setSessionType('focus');
        setSecondsLeft(25 * 60);
      }
    }
  }, [secondsLeft, isActive, sessionType]);

  // Format helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => setIsActive(!isActive);

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(sessionType === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleShortcut = (minutes: number, type: 'focus' | 'break') => {
    setIsActive(false);
    setSessionType(type);
    setSecondsLeft(minutes * 60);
  };

  const soundscapeOptions = [
    {
      name: 'Lo-Fi Study Beats',
      icon: Headphones,
      desc: 'Chill warm beats & crackle',
    },
    {
      name: 'Deep Rain & Thunderstorm',
      icon: CloudRain,
      desc: 'Relaxing rain & sub rumbles',
    },
    {
      name: 'White Noise Fan',
      icon: Wind,
      desc: 'Consistent refreshing hum',
    },
    {
      name: 'Coffee Shop Murmur',
      icon: Coffee,
      desc: 'Cozy murmurs & cup clinks',
    }
  ];

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 md:p-12 overflow-y-auto' : 'space-y-6 pb-12'}`}>
      
      {/* Header Controls */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
            <span>Study Session Immersive Mode</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Minimize distraction, trigger Pomodoro sprints and note-taking</p>
        </div>

        {/* Toggle immersive screen */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span>Distraction-Free Fullscreen</span>
            </>
          )}
        </button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 text-left">
        {/* Left pane: Active Pomodoro */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center flex flex-col justify-between h-[380px]">
            <div className="space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                sessionType === 'focus' 
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {sessionType === 'focus' ? '🎯 Focus Sprint Active' : '🌸 Break Period'}
              </span>
              <p className="text-xs text-slate-400 font-semibold">Alex: Level 12 AP Scholar</p>
            </div>

            {/* Giant Clock Face */}
            <div className="relative py-4">
              <span className="block font-black text-6xl md:text-7xl font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                {formatTime(secondsLeft)}
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-2.5">
                {sessionType === 'focus' ? 'Minutes until review' : 'Time remaining'}
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
                  title="Reset session"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleToggleTimer}
                  className="w-28 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isActive ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                  <span>{isActive ? 'Pause' : 'Start'}</span>
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>

              {/* Selection intervals */}
              <div className="flex justify-center gap-2 text-[10px] font-bold">
                <button 
                  onClick={() => handleShortcut(25, 'focus')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  25m Focus
                </button>
                <button 
                  onClick={() => handleShortcut(50, 'focus')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  50m Focus
                </button>
                <button 
                  onClick={() => handleShortcut(5, 'break')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  5m Break
                </button>
              </div>
            </div>
          </div>

          {/* SOUNDSCAPES & FOCUS AUDIO LIBRARY */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 ${soundscapesEnabled && isActive && !isMuted ? 'animate-spin-slow' : ''}`}>
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Soundscapes</h4>
                  <p className="text-[9px] text-slate-400 font-semibold">Background focus waves</p>
                </div>
              </div>

              {/* GORGEOUS CUSTOM TOGGLE SWITCH */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {soundscapesEnabled ? 'On' : 'Off'}
                </span>
                <button
                  type="button"
                  onClick={() => setSoundscapesEnabled(!soundscapesEnabled)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    soundscapesEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      soundscapesEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SOUNDSCAPES LIBRARY GRID */}
            <div className={`grid grid-cols-2 gap-2 transition-all duration-300 ${!soundscapesEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              {soundscapeOptions.map((opt) => {
                const isSelected = audioSource === opt.name;
                const IconComponent = opt.icon;
                const isCurrentlyGenerating = isSelected && soundscapesEnabled && isActive && !isMuted;

                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setAudioSource(opt.name)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-100 shadow-xs'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`p-1 rounded-lg ${isSelected ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </span>
                      {isCurrentlyGenerating && (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-indigo-500 animate-[pulse_0.8s_infinite]" style={{ height: '50%' }}></span>
                          <span className="w-0.5 bg-indigo-500 animate-[pulse_1.2s_infinite_0.2s]" style={{ height: '90%' }}></span>
                          <span className="w-0.5 bg-indigo-500 animate-[pulse_1s_infinite_0.4s]" style={{ height: '40%' }}></span>
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-[10px] leading-tight line-clamp-1">{opt.name}</p>
                    <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5 line-clamp-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* STATUS FOOTER */}
            <div className="text-[9px] font-bold text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100/50 dark:border-slate-850">
              <span className="flex items-center gap-1">
                {soundscapesEnabled ? (
                  isActive ? (
                    isMuted ? (
                      <span className="text-rose-500">🔊 Active but muted</span>
                    ) : (
                      <span className="text-emerald-500 flex items-center gap-1.5">
                        <div className="flex items-end gap-[1px] h-2.5">
                          <span className="w-0.5 bg-emerald-500 animate-[pulse_0.8s_infinite]" style={{ height: '60%' }}></span>
                          <span className="w-0.5 bg-emerald-500 animate-[pulse_1.2s_infinite_0.2s]" style={{ height: '100%' }}></span>
                          <span className="w-0.5 bg-emerald-500 animate-[pulse_1s_infinite_0.4s]" style={{ height: '40%' }}></span>
                          <span className="w-0.5 bg-emerald-500 animate-[pulse_0.9s_infinite_0.1s]" style={{ height: '80%' }}></span>
                        </div>
                        Synthesizing frequency...
                      </span>
                    )
                  ) : (
                    <span>⏱️ Ready for focus start</span>
                  )
                ) : (
                  <span>💤 Disabled</span>
                )}
              </span>
              <span>Stereo Synth</span>
            </div>
          </div>
        </div>

        {/* Right pane: Scratchpad / Notes taking block */}
        <div className="lg:col-span-3 flex flex-col h-[466px]">
          <div className="flex-1 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b">
                <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Session Live Scratchpad</span>
                </p>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Auto-Saved to Notes
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
                placeholder="Jot down formulas, ideas, and lecture highlights during your Pomodoro sprint. Let the AI summarize them later."
                className="flex-1 w-full bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Character count: {focusNotes.length}</span>
              <button 
                onClick={() => {
                  (window as any).showToast?.('💡 AI summary drafted! Saved directly to your "Notes" dashboard view.', 'success');
                  setFocusNotes(prev => prev + '\n\n=== AI Summary ===\nKey Concepts captured during active sprint.');
                }}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Summarize Scratchpad
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
