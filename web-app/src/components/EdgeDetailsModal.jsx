import React, { useState, useEffect } from 'react';
import './EdgeDetailsModal.css';
import { FaCheck, FaTimes } from 'react-icons/fa';

const EdgeDetailsModal = ({ edge, onClose, onDelayChange }) => {
  const [pendingDelay, setPendingDelay] = useState(edge?.delay || 0);
  const [isChanged, setIsChanged] = useState(false);
  
  // Update local state when edge prop changes
  useEffect(() => {
    setPendingDelay(edge?.delay || 0);
    setIsChanged(false);
  }, [edge]);
  
  if (!edge) return null;

  const handleDelayChange = (newDelay) => {
    // Ensure delay is a number and doesn't go below 0
    const updatedDelay = Math.max(0, Number(newDelay));
    setPendingDelay(updatedDelay);
    setIsChanged(updatedDelay !== (edge.delay || 0));
  };
  
  const applyChanges = () => {
    if (onDelayChange && !isNaN(pendingDelay)) {
      onDelayChange(edge.id, pendingDelay);
      setIsChanged(false);
      // Close the modal after a short delay to show the edge update
      setTimeout(() => onClose(), 100);
    }
  };
  
  const cancelChanges = () => {
    setPendingDelay(edge.delay || 0);
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
