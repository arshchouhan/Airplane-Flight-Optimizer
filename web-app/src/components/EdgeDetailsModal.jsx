import React, { useState, useEffect } from 'react';
import './EdgeDetailsModal.css';
import { FaCheck, FaTimes, FaPlane, FaChartLine } from 'react-icons/fa';

const EdgeDetailsModal = ({ edge, onClose, onDelayChange, onFrequencyChange }) => {
  const [pendingDelay, setPendingDelay] = useState(edge?.delay || 0);
  const [frequency, setFrequency] = useState(edge?.frequency || 1);
  const [isChanged, setIsChanged] = useState(false);
  
  // Update local state when edge prop changes
  useEffect(() => {
    setPendingDelay(edge?.delay || 0);
    setFrequency(edge?.frequency || 1);
    setIsChanged(false);
  }, [edge]);
  
  if (!edge) return null;

  const handleDelayChange = (newDelay) => {
    // Ensure delay is a number and doesn't go below 0
    const updatedDelay = Math.max(0, Number(newDelay));
    setPendingDelay(updatedDelay);
    setIsChanged(updatedDelay !== (edge.delay || 0));
  };

  const handleFrequencyChange = (newFrequency) => {
    // Ensure frequency is between 1 and 10
    const updatedFrequency = Math.max(1, Math.min(10, Number(newFrequency)));
    setFrequency(updatedFrequency);
    setIsChanged(updatedFrequency !== (edge.frequency || 1));
  };

  const getFrequencyLabel = (freq) => {
    if (freq <= 2) return 'Low';
    if (freq <= 5) return 'Medium';
    if (freq <= 8) return 'High';
    return 'Very High';
  };

  const getFrequencyDescription = (freq) => {
    if (freq <= 2) return 'Limited flights - book in advance';
    if (freq <= 5) return 'Regular service - good availability';
    if (freq <= 8) return 'Frequent flights - flexible options';
    return 'Continuous service - maximum flexibility';
  };
  
  const applyChanges = () => {
    if (onDelayChange && !isNaN(pendingDelay)) {
      onDelayChange(edge.id, pendingDelay);
      
      if (onFrequencyChange) {
        onFrequencyChange(edge.id, frequency);
      }
      
      setIsChanged(false);
      // Close the modal after a short delay to show the edge update
      setTimeout(() => onClose(), 100);
    }
  };
  
  const cancelChanges = () => {
    setPendingDelay(edge.delay || 0);
    setFrequency(edge.frequency || 1);
    setIsChanged(false);
  };

  const getDelaySeverity = (delay) => {
    if (delay === 0) return '';
    if (delay <= 30) return 'delay-low';
    if (delay <= 60) return 'delay-medium';
    return 'delay-high';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        <h3>Route Controls</h3>
        <div className="edge-details">
          <div className="route-info">
            <div className="airport-row">
              <span className="airport-label">From</span>
              <span className="airport-name">{edge.sourceName || `Airport ${edge.source}`}</span>
              <span className="airport-connector">→</span>
              <span className="airport-name">{edge.targetName || `Airport ${edge.target}`}</span>
              <span className="airport-label">To</span>
            </div>
            <div className="distance-badge">{edge.distance} km</div>
          </div>
          
          <div className="delay-controls">
            <div className="delay-header">
              <h4>Delay Simulation</h4>
              <span className={`delay-badge ${getDelaySeverity(pendingDelay)}`}>
                {pendingDelay > 0 ? `${pendingDelay} min delay` : 'No delay'}
              </span>
            </div>
            
            <div className="delay-buttons">
              <button 
                onClick={() => handleDelayChange(pendingDelay - 15)}
                disabled={pendingDelay <= 0}
                className="delay-button minus"
              >
                -
              </button>
              
              <div className="delay-slider">
                <div 
                  className="delay-progress"
                  style={{ width: `${Math.min(100, (pendingDelay / 120) * 100)}%` }}
                />
                <div className="delay-ticks">
                  <span>0</span>
                  <span>30</span>
                  <span>60</span>
                  <span>90</span>
                  <span>120+</span>
                </div>
              </div>
              
              <button 
                onClick={() => handleDelayChange(pendingDelay + 15)}
                disabled={pendingDelay >= 120}
                className="delay-button plus"
              >
                +
              </button>
            </div>
            
            <div className="delay-tip">
              {pendingDelay > 0 ? (
                <span className="delay-warning">
                  ⚠️ This will affect route calculations
                </span>
              ) : (
                <span>Adjust delay to simulate traffic or weather conditions</span>
              )}
            </div>
            
            <div className="frequency-controls">
              <div className="frequency-header">
                <FaChartLine className="frequency-icon" />
                <h4>Flight Frequency</h4>
                <span className={`frequency-badge frequency-${getFrequencyLabel(frequency).toLowerCase()}`}>
                  {getFrequencyLabel(frequency)} ({frequency}/{frequency === 1 ? 'day' : 'days'})
                </span>
              </div>
              
              <div className="frequency-slider">
                <div className="frequency-labels">
                  <span>1/day</span>
                  <span>10/day</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={frequency}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  className="frequency-range"
                />
                <div className="frequency-ticks">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
                    <span 
                      key={tick} 
                      className={`tick ${tick <= frequency ? 'active' : ''}`}
                      onClick={() => handleFrequencyChange(tick)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="frequency-description">
                <FaPlane className="description-icon" />
                <span>{getFrequencyDescription(frequency)}</span>
              </div>
            </div>
            

            
            {isChanged && (
              <div className="action-buttons">
                <button 
                  className="action-button apply-button"
                  onClick={applyChanges}
                >
                  <FaCheck /> Apply Changes
                </button>
                <button 
                  className="action-button cancel-button"
                  onClick={cancelChanges}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeDetailsModal;
