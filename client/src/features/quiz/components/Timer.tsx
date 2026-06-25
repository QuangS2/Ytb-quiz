import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  /** Whether the timer should be actively counting up */
  isActive: boolean;
  /** Callback fired every second with the current elapsed time.
   *  Best used to update a parent ref (e.g. timeTakenRef.current = seconds) to prevent parent re-renders.
   */
  onTimeChange?: (seconds: number) => void;
  /** Custom inline styles for the timer wrapper */
  style?: React.CSSProperties;
}

export const Timer: React.FC<TimerProps> = ({ 
  isActive, 
  onTimeChange,
  style 
}) => {
  const [seconds, setSeconds] = useState(0);

  // Active ticking mechanism
  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      setSeconds(prev => {
        const nextSeconds = prev + 1;
        if (onTimeChange) {
          onTimeChange(nextSeconds);
        }
        return nextSeconds;
      });
    }, 1000);

    // CRITICAL: Cleanup interval on unmount or when status becomes inactive to prevent memory leaks
    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, onTimeChange]);

  // Format seconds to hh:mm:ss or mm:ss
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const pad = (num: number) => String(num).padStart(2, '0');
    
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div 
      className="glass-panel" 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        borderRadius: 'var(--border-radius-sm)',
        background: 'rgba(15, 23, 42, 0.4)',
        borderColor: 'var(--glass-border)',
        ...style
      }}
    >
      <Clock size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
      
      <span 
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          minWidth: '45px',
          textAlign: 'center',
          letterSpacing: '0.5px'
        }}
      >
        {formatTime(seconds)}
      </span>

      {/* Pulsing indicator to show it is active */}
      {isActive && (
        <span 
          data-testid="timer-pulse"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-success)',
            display: 'inline-block',
            boxShadow: '0 0 8px var(--color-success)',
            animation: 'timerPulse 1.5s infinite ease-in-out',
            marginLeft: '2px'
          }}
        />
      )}

      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default Timer;
