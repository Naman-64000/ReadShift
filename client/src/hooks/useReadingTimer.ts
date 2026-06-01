/**
 * client/src/hooks/useReadingTimer.ts
 *
 * Drift-corrected interval timer for the reading engine.
 * Uses a self-correcting setTimeout loop that compares expected vs actual
 * wall-clock time each tick and adjusts the next delay to compensate.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseReadingTimerOptions {
  totalChunks: number;
  intervalMs: number;           // ms between chunk advances
  onComplete: (elapsedMs: number) => void;
  autoStart?: boolean;
  extraDelayMsByNextChunk?: Record<number, number>;
  customChunkIntervalsMs?: number[]; // custom pacing per chunk index
}

interface ReadingTimerReturn {
  currentChunkIndex: number;
  elapsedMs: number;
  isPaused: boolean;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useReadingTimer({
  totalChunks,
  intervalMs,
  onComplete,
  autoStart = false,
  extraDelayMsByNextChunk = {},
  customChunkIntervalsMs,
}: UseReadingTimerOptions): ReadingTimerReturn {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Refs hold mutable state that doesn't need to trigger re-renders
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWallTimeRef = useRef<number>(0);   // wall clock when timer started/resumed
  const elapsedAtPauseRef = useRef<number>(0);  // elapsed ms accumulated before pause
  const chunkRef = useRef(0);                    // current chunk (avoids stale closure)
  const pausedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const intervalRef = useRef(intervalMs);
  const extraDelayRef = useRef(extraDelayMsByNextChunk);
  const customIntervalsRef = useRef(customChunkIntervalsMs);

  // Keep refs in sync with latest values
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { intervalRef.current = intervalMs; }, [intervalMs]);
  useEffect(() => { extraDelayRef.current = extraDelayMsByNextChunk; }, [extraDelayMsByNextChunk]);
  useEffect(() => { customIntervalsRef.current = customChunkIntervalsMs; }, [customChunkIntervalsMs]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
    }
    tickerRef.current = setInterval(() => {
      if (!pausedRef.current && startWallTimeRef.current > 0) {
        const currentElapsed = elapsedAtPauseRef.current + (performance.now() - startWallTimeRef.current);
        setElapsedMs(Math.round(currentElapsed));
      }
    }, 100);
  }, []);

  const tick = useCallback((expectedTickTime: number, chunkIdx: number) => {
    if (pausedRef.current) return;

    const now = performance.now();
    const drift = now - expectedTickTime;             // positive = we're late
    const nextChunk = chunkIdx + 1;
    const transitionExtra = extraDelayRef.current[nextChunk] ?? 0;
    
    // Resolve dynamic LAAP or static interval for the upcoming nextChunk
    const baseInterval = customIntervalsRef.current && customIntervalsRef.current[nextChunk] !== undefined
      ? customIntervalsRef.current[nextChunk]
      : intervalRef.current;

    // First 3 chunks warm-up gets +400ms duration (chunkIdx 0, 1, 2)
    const warmUpExtra = (nextChunk < 3) ? 400 : 0;

    const targetInterval = baseInterval + transitionExtra + warmUpExtra;
    const nextInterval = Math.max(0, targetInterval - drift);

    chunkRef.current = nextChunk;
    setCurrentChunkIndex(nextChunk);

    // Update elapsed — total elapsed = pre-pause elapsed + current run elapsed
    const currentElapsed = elapsedAtPauseRef.current + (now - startWallTimeRef.current);
    setElapsedMs(Math.round(currentElapsed));

    if (nextChunk >= totalChunks) {
      // Reading complete
      clearTimer();
      setIsRunning(false);
      onCompleteRef.current(Math.round(currentElapsed));
      return;
    }

    // Schedule next tick with drift compensation
    timerRef.current = setTimeout(
      () => tick(expectedTickTime + targetInterval, nextChunk),
      nextInterval
    );
  }, [totalChunks, clearTimer]);

  const start = useCallback(() => {
    if (isRunning) return;
    chunkRef.current = 0;
    setCurrentChunkIndex(0);
    setElapsedMs(0);
    elapsedAtPauseRef.current = 0;
    pausedRef.current = false;
    autoPausedRef.current = false;
    setIsPaused(false);
    setIsRunning(true);

    const now = performance.now();
    startWallTimeRef.current = now;

    startTicker();

    // First chunk (chunk 0) gets +400ms warm-up pacing padding
    const firstInterval = (customIntervalsRef.current && customIntervalsRef.current[0] !== undefined
      ? customIntervalsRef.current[0]
      : intervalRef.current) + 400;

    // First tick after one interval
    timerRef.current = setTimeout(
      () => tick(now + firstInterval, 0),
      firstInterval
    );
  }, [isRunning, tick, startTicker]);

  const pause = useCallback(() => {
    if (!isRunning || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    clearTimer();
    // Accumulate elapsed time up to this point
    const exactElapsed = elapsedAtPauseRef.current + (performance.now() - startWallTimeRef.current);
    elapsedAtPauseRef.current = exactElapsed;
    setElapsedMs(Math.round(exactElapsed));
  }, [isRunning, clearTimer]);

  const resume = useCallback(() => {
    if (!isRunning || !pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    const now = performance.now();
    startWallTimeRef.current = now;

    startTicker();

    const warmUpExtra = (chunkRef.current < 3) ? 400 : 0;
    const resumeInterval = (customIntervalsRef.current && customIntervalsRef.current[chunkRef.current] !== undefined
      ? customIntervalsRef.current[chunkRef.current]
      : intervalRef.current) + warmUpExtra;

    // Continue from current chunk
    timerRef.current = setTimeout(
      () => tick(now + resumeInterval, chunkRef.current),
      resumeInterval
    );
  }, [isRunning, tick, startTicker]);

  const reset = useCallback(() => {
    clearTimer();
    pausedRef.current = false;
    autoPausedRef.current = false;
    chunkRef.current = 0;
    elapsedAtPauseRef.current = 0;
    setCurrentChunkIndex(0);
    setElapsedMs(0);
    setIsPaused(false);
    setIsRunning(false);
  }, [clearTimer]);

  // Pause when tab loses visibility or window loses focus, resume on return
  useEffect(() => {
    const handlePause = () => {
      if (isRunning && !pausedRef.current) {
        autoPausedRef.current = true;
        pause();
      }
    };

    const handleResume = () => {
      if (isRunning && autoPausedRef.current) {
        autoPausedRef.current = false;
        resume();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePause();
      } else {
        handleResume();
      }
    };

    const handleWindowBlur = () => {
      handlePause();
    };

    const handleWindowFocus = () => {
      handleResume();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isRunning, pause, resume]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && totalChunks > 0 && !isRunning) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, totalChunks]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { currentChunkIndex, elapsedMs, isPaused, isRunning, start, pause, resume, reset };
}
