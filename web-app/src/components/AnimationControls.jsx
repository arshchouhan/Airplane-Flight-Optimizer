import React, { useState } from 'react';
import { FaPlay, FaPause, FaUndo } from 'react-icons/fa';
import '../styles/AnimationControls.css';

const AnimationControls = ({
  isPlaying,
  onPlayPause,
  onReset,
  speed,
  onSpeedChange,
  isPathCalculated,
}) => {
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const speedLabels = {
    1: 'Slow',
    2: 'Medium',
    3: 'Fast',
    4: 'Faster',
    5: 'Fastest'
  };

  if (!isPathCalculated) return null;

  return (
    <div className="animation-controls">
      <button 
        className="control-button" 
        onClick={onPlayPause}
        title={isPlaying ? 'Pause' : 'Play'}
        disabled={!isPathCalculated}
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      
      <button 
        className="control-button" 
        onClick={onReset}
        title="Reset"
        disabled={!isPathCalculated}
      >
        <FaUndo />
      </button>
      
      <div className="speed-control">
        <button 
          className="speed-button"
          onClick={() => setShowSpeedOptions(!showSpeedOptions)}
          title="Change speed"
        >
          {speedLabels[speed] || 'Speed'}
        </button>
        
        {showSpeedOptions && (
          <div className="speed-options">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                className={`speed-option ${speed === s ? 'active' : ''}`}
                onClick={() => {
                  onSpeedChange(s);
                  setShowSpeedOptions(false);
                }}
              >
                {speedLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimationControls;
