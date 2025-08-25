import React, { useState, useEffect } from 'react';
import './EdgeDetailsModal.css';
import { FaCheck, FaTimes, FaPlane, FaChartLine } from 'react-icons/fa';

const EdgeDetailsModal = ({ edge, onClose, onDelayChange, onFrequencyChange, onDistanceChange, onTimeChange, showToast }) => {
  const [pendingDelay, setPendingDelay] = useState(edge?.delay || 0);
  const [frequency, setFrequency] = useState(edge?.frequency || 1);
  const [isChanged, setIsChanged] = useState(false);
  const [expandedOption, setExpandedOption] = useState(null); // null, 'frequencyChanger', 'changeDistance', or 'addDelay'
  const [customDistance, setCustomDistance] = useState(edge?.distance || 0);
  const [customTime, setCustomTime] = useState(Math.round((edge?.distance || 0) / 800 * 60));
  
  // Update local state when edge prop changes
  useEffect(() => {
    setPendingDelay(edge?.delay || 0);
    setFrequency(edge?.frequency || 1);
    setCustomDistance(edge?.distance || 0);
    setCustomTime(Math.round((edge?.distance || 0) / 800 * 60));
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
    const updatedFrequency = Number(newFrequency);
    setFrequency(updatedFrequency);
    setIsChanged(updatedFrequency !== (edge.frequency || 1));
  };

  const handleDistanceChange = (newDistance) => {
    const updatedDistance = Math.max(0, Number(newDistance));
    setCustomDistance(updatedDistance);
    setIsChanged(updatedDistance !== (edge.distance || 0) || 
                 customTime !== Math.round((edge?.distance || 0) / 800 * 60) ||
                 pendingDelay !== (edge.delay || 0) ||
                 frequency !== (edge.frequency || 1));
  };

  const handleTimeChange = (newTime) => {
    const updatedTime = Math.max(0, Number(newTime));
    setCustomTime(updatedTime);
    setIsChanged(updatedTime !== Math.round((edge?.distance || 0) / 800 * 60) ||
                 customDistance !== (edge.distance || 0) ||
                 pendingDelay !== (edge.delay || 0) ||
                 frequency !== (edge.frequency || 1));
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
    // Determine what changed for summary
    const originalDelay = edge.delay || 0;
    const originalFreq = edge.frequency || 1;
    const originalDistance = edge.distance || 0;
    const originalTime = Math.round((edge?.distance || 0) / 800 * 60);

    const changes = [];
    if (pendingDelay !== originalDelay) changes.push(`delay set to ${pendingDelay} min`);
    if (frequency !== originalFreq) changes.push(`frequency set to ${frequency}/day`);
    if (customDistance !== originalDistance) changes.push(`distance set to ${customDistance} km`);
    if (customTime !== originalTime) changes.push(`flight time set to ${customTime} min`);

    onDelayChange(edge.id, pendingDelay);
    onFrequencyChange(edge.id, frequency);
    if (onDistanceChange) onDistanceChange(edge.id, customDistance);
    if (onTimeChange) onTimeChange(edge.id, customTime);

    // Show success toast summary
    if (showToast) {
      const fromLabel = edge.sourceName || `Airport ${edge.source}`;
      const toLabel = edge.targetName || `Airport ${edge.target}`;
      const detail = changes.length ? changes.join(', ') : 'no changes';
      showToast(`Route ${fromLabel} → ${toLabel}: ${detail}`, changes.length ? 'success' : 'info');
    }

    setIsChanged(false);
    onClose(); // Close modal and clear edge selection to remove details
  };
  
  const cancelChanges = () => {
    setPendingDelay(edge.delay || 0);
    setFrequency(edge.frequency || 1);
    setCustomDistance(edge.distance || 0);
    setCustomTime(Math.round((edge?.distance || 0) / 800 * 60));
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
              <span className="airport-label">To</span>
              <span className="airport-name">{edge.targetName || `Airport ${edge.target}`}</span>
            </div>
            <div className="route-stats">
              <div className="stat-item">
                <span className="stat-label">Distance</span>
                <span className="stat-value">{customDistance} km</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Flight Time</span>
                <span className="stat-value">{customTime + pendingDelay} min</span>
              </div>
            </div>
          </div>
          
          {/* Expandable Options */}
          <div className="expandable-options">
            {/* Frequency Changer Option */}
            <div className="option-section">
              <button 
                className={`option-header ${expandedOption === 'frequencyChanger' ? 'expanded' : ''}`}
                onClick={() => setExpandedOption(expandedOption === 'frequencyChanger' ? null : 'frequencyChanger')}
              >
                <FaChartLine className="option-icon" />
                <span>Frequency Changer</span>
                <span className="expand-arrow">{expandedOption === 'frequencyChanger' ? '▼' : '▶'}</span>
              </button>
              
              {expandedOption === 'frequencyChanger' && (
                <div className="option-content">
                  <div className="frequency-controls">
                    <div className="frequency-header">
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
                </div>
              )}
            </div>

            {/* Change Distance/Time Option */}
            <div className="option-section">
              <button 
                className={`option-header ${expandedOption === 'changeDistance' ? 'expanded' : ''}`}
                onClick={() => setExpandedOption(expandedOption === 'changeDistance' ? null : 'changeDistance')}
              >
                <span className="distance-icon">📏</span>
                <span>Change Distance/Time</span>
                <span className="expand-arrow">{expandedOption === 'changeDistance' ? '▼' : '▶'}</span>
              </button>
              
              {expandedOption === 'changeDistance' && (
                <div className="option-content">
                  <div className="distance-controls">
                    <div className="distance-option">
                      <h4>Change Distance</h4>
                      <div className="distance-input-group">
                        <div className="input-with-controls">
                          <input
                            type="number"
                            value={customDistance}
                            onChange={(e) => handleDistanceChange(e.target.value)}
                            min="0"
                            step="10"
                            className="distance-input"
                          />
                          <div className="input-controls">
                            <button 
                              className="input-arrow up"
                              onClick={() => handleDistanceChange(customDistance + 10)}
                              type="button"
                            >
                              ▲
                            </button>
                            <button 
                              className="input-arrow down"
                              onClick={() => handleDistanceChange(customDistance - 10)}
                              type="button"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <span className="distance-unit">km</span>
                      </div>
                      <p className="distance-note">Original: {edge.distance} km</p>
                    </div>
                    
                    <div className="time-option">
                      <h4>Change Flight Time</h4>
                      <div className="time-input-group">
                        <div className="input-with-controls">
                          <input
                            type="number"
                            value={customTime}
                            onChange={(e) => handleTimeChange(e.target.value)}
                            min="0"
                            step="5"
                            className="time-input"
                          />
                          <div className="input-controls">
                            <button 
                              className="input-arrow up"
                              onClick={() => handleTimeChange(customTime + 5)}
                              type="button"
                            >
                              ▲
                            </button>
                            <button 
                              className="input-arrow down"
                              onClick={() => handleTimeChange(customTime - 5)}
                              type="button"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="time-note">Original: {Math.round((edge.distance || 0) / 800 * 60)} min</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add Delay Option */}
            <div className="option-section">
              <button 
                className={`option-header ${expandedOption === 'addDelay' ? 'expanded' : ''}`}
                onClick={() => setExpandedOption(expandedOption === 'addDelay' ? null : 'addDelay')}
              >
                <span className="delay-icon">⏱️</span>
                <span>Add Delay</span>
                <span className="expand-arrow">{expandedOption === 'addDelay' ? '▼' : '▶'}</span>
              </button>
              
              {expandedOption === 'addDelay' && (
                <div className="option-content">
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
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons - shown when any option is expanded and changes are made */}
          {expandedOption && (
            <div className={`action-buttons ${!isChanged ? 'skeleton' : ''}`}>
              <button 
                className={`action-button apply-button ${!isChanged ? 'skeleton' : ''}`}
                onClick={applyChanges}
                disabled={!isChanged}
              >
                <FaCheck /> Apply Changes
              </button>
              <button 
                className={`action-button cancel-button ${!isChanged ? 'skeleton' : ''}`}
                onClick={cancelChanges}
                disabled={!isChanged}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EdgeDetailsModal;
