import React, { useEffect, useState, useRef } from 'react';
import '../styles/AlgorithmSettingsPanel.css';

const AlgorithmSettingsPanel = ({ 
  algorithm, 
  isVisible, 
  onClose, 
  performanceMetrics, 
  onVisualize, 
  selectedAlgorithm,
  selectedAirports = [],
  showToast,
  isInVisualization = false
}) => {
  const [metrics, setMetrics] = useState({
    executionTime: 0,
    visitedNodes: 0,
    pathCost: 0,
    algorithmSteps: 0,
    frontierNodes: 0,
    memoryUsage: '0 MB'
  });
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visualizationComplete, setVisualizationComplete] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  // Track when the first live update arrives to avoid flashing stale values
  const [liveStarted, setLiveStarted] = useState(false);
  // Track progress timers so we can cancel when algorithm completes
  const progressIntervalRef = useRef(null);
  const progressFinalTimeoutRef = useRef(null);

  useEffect(() => {
    if (performanceMetrics) {
      setMetrics(prev => ({
        executionTime: performanceMetrics.executionTime || 0,
        visitedNodes: performanceMetrics.visitedNodes || 0,
        pathCost: performanceMetrics.pathCost || 0,
        algorithmSteps: performanceMetrics.algorithmSteps || 0,
        frontierNodes: performanceMetrics.frontierNodes || 0,
        memoryUsage: performanceMetrics.memoryUsage || '0 MB'
      }));
    }
  }, [performanceMetrics]);

  // Trigger a short reveal animation when metrics become available
  useEffect(() => {
    if (visualizationComplete) {
      setJustRevealed(true);
      const t = setTimeout(() => setJustRevealed(false), 1800);
      return () => clearTimeout(t);
    }
  }, [visualizationComplete]);

  // Reveal metrics immediately only when completion occurs during visualization
  useEffect(() => {
    if (isInVisualization && performanceMetrics?.completedAt) {
      setProgress(100);
      setVisualizationComplete(true);
    }
  }, [isInVisualization, performanceMetrics?.completedAt]);

  // Stop progress timer and reveal metrics immediately upon algorithm completion (only while visualizing)
  useEffect(() => {
    if (isInVisualization && performanceMetrics?.completedAt) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (progressFinalTimeoutRef.current) {
        clearTimeout(progressFinalTimeoutRef.current);
        progressFinalTimeoutRef.current = null;
      }
      setProgress(100);
      setVisualizationComplete(true);
    }
  }, [isInVisualization, performanceMetrics?.completedAt]);

  // When exiting visualization mode, reset metrics panel to placeholder state
  useEffect(() => {
    if (!isInVisualization) {
      setVisualizationComplete(false);
      setProgress(0);
      setLiveStarted(false);
    }
  }, [isInVisualization]);

  // When visualization starts, clear prior metrics so the yellow card shows 0s initially
  useEffect(() => {
    if (isInVisualization) {
      setLiveStarted(false);
      setMetrics({
        executionTime: 0,
        visitedNodes: 0,
        pathCost: 0,
        algorithmSteps: 0,
        frontierNodes: 0,
        memoryUsage: '0 MB'
      });
    }
  }, [isInVisualization]);

  // Mark live as started when the first onProgress update comes in
  useEffect(() => {
    if (!isInVisualization) return;
    if (performanceMetrics && performanceMetrics.timestamp) {
      setLiveStarted(true);
    }
  }, [isInVisualization, performanceMetrics?.timestamp]);

  // Reset progress immediately when fewer than 2 airports are selected
  useEffect(() => {
    if ((selectedAirports?.length || 0) < 2) {
      setIsVisualizing(false);
      setProgress(0);
      setVisualizationComplete(false);
      setLiveStarted(false);
    }
  }, [selectedAirports]);

  // Also reset progress when the selected airport pair changes
  const prevPairRef = useRef('');
  useEffect(() => {
    const pairKey = (selectedAirports && selectedAirports.length === 2)
      ? `${selectedAirports[0]?.id}-${selectedAirports[1]?.id}`
      : '';

    if (pairKey !== prevPairRef.current) {
      // Pair changed: restart progress state
      setIsVisualizing(false);
      setProgress(0);
      setVisualizationComplete(false);
      prevPairRef.current = pairKey;
    }
  }, [selectedAirports]);

  if (!isVisible) return null;

  const renderSettings = () => {
    switch (algorithm) {
      case 'dijkstra':
        return (
          <div className="algorithm-settings">
            <p>Finds the shortest path from source to all nodes</p>
          </div>
        );
      case 'astar':
        return (
          <div className="algorithm-settings">
            <p>Uses heuristics to find the shortest path more efficiently than Dijkstra</p>
          </div>
        );
      case 'bellman-ford':
        return (
          <div className="algorithm-settings">
            <p>Handles graphs with negative weights</p>
          </div>
        );
      case 'floyd-warshall':
        return (
          <div className="algorithm-settings">
            <p>Finds shortest paths between all pairs of nodes</p>
          </div>
        );
      default:
        return null;
    }
  };

  const handleVisualize = () => {
    // If already in visualization mode, this acts as an Exit toggle
    if (isInVisualization) {
      setIsVisualizing(false);
      setVisualizationComplete(false);
      setProgress(0);
      onVisualize?.();
      return;
    }

    if (selectedAirports.length < 2) {
      // Show toast message if not enough airports are selected
      if (typeof showToast === 'function') {
        showToast('Please select 2 airports to visualize', 'warning', 3000);
      } else {
        console.warn('Toast not available: Please select 2 airports to visualize');
      }
      return;
    }
    
    // Reset state for new visualization
    setIsVisualizing(true);
    setVisualizationComplete(false);
    setProgress(0);
    
    // Call the actual visualization function
    onVisualize?.();
    
    // Start progress animation with consistent speed
    let progressValue = 0;
    const totalDuration = algorithm === 'dijkstra' ? 16000 : 15000; // 16 seconds for Dijkstra, 15 for others
    
    // Calculate consistent increment based on update interval and total duration
    // For a 100ms interval and 16000ms duration, we need ~160 increments to reach 100%
    // So each increment should be ~0.625% for consistent speed
    const updateInterval = 100; // milliseconds
    const consistentIncrement = (100 * updateInterval) / totalDuration;
    
    // Clear any existing timers before starting new ones
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (progressFinalTimeoutRef.current) clearTimeout(progressFinalTimeoutRef.current);

    const interval = setInterval(() => {
      // Apply consistent increment for smooth, linear progress
      progressValue += consistentIncrement;
      
      // Ensure we don't exceed 99% until the final timeout
      if (progressValue >= 99) {
        progressValue = 99;
      }
      
      setProgress(progressValue);
    }, updateInterval);
    progressIntervalRef.current = interval;
    
    // Set to 100% only after the full duration
    const finalTimeout = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setVisualizationComplete(true);
      
      // Keep active state for a moment after completion
      setTimeout(() => {
        setIsVisualizing(false);
        // Don't reset progress - it will stay at 100%
      }, 2000);
    }, totalDuration);
    progressFinalTimeoutRef.current = finalTimeout;
  };

  

  return (
    <div className={`algorithm-settings-panel ${isVisible ? 'is-visible' : ''}`}>
      <div className="panel-header">
        <h3>{algorithm === 'dijkstra' ? "Dijkstra" : 
             algorithm === 'astar' ? 'A*' : 
             algorithm === 'bellman-ford' ? 'Bellman-Ford' : 
             'Floyd-Warshall'} Algorithm</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      {renderSettings()}
      
      <div className="visualize-section">
        <div className="visualize-btn-container">
          <button 
            className={`visualize-btn ${selectedAirports.length < 2 ? 'need-two' : ''}`}
            onClick={handleVisualize}
            title={isInVisualization ? 'Exit visualization' : 'Visualize the selected algorithm'}
          >
            {isInVisualization ? 'Exit' : 'Visualize'}
          </button>
        </div>
      </div>

      {/* Visualization status block */}
      {algorithm === 'astar' && (
        <div className={`astar-info-card ${!isInVisualization ? 'faded' : ''}`}>
          {(() => {
            // Show zeros until first onProgress update arrives to prevent stale flicker
            const showingLive = !!isInVisualization && liveStarted;
            const step = showingLive ? Number(metrics.algorithmSteps || 0) : 0;
            const visited = showingLive ? Number(metrics.visitedNodes || 0) : 0;
            const frontier = showingLive ? Number(metrics.frontierNodes || 0) : 0;
            return (
              <div className="astar-stats">
                <div className="row"><span className="label">Step:</span><span className="value">{step}</span></div>
                <div className="row"><span className="label">Visited:</span><span className="value">{visited}</span></div>
                <div className="row"><span className="label">Frontier:</span><span className="value">{frontier}</span></div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Keep Open/Closed sets visible for non-A* algorithms; fade when not visualizing */}
      {algorithm !== 'astar' && (
        <div className={`sets-visualizer ${!isInVisualization ? 'faded' : ''}`}>
          <h4 className="sets-title">Exploration (Open vs Closed)</h4>
          <div className="sets-subtitle">Visualization shows frontier (open-like) vs explored (closed-like).</div>
          <div className="sets-grid">
            {(() => {
              const showingLive = !!isInVisualization && liveStarted && (selectedAirports?.length === 2);
              const openCount = showingLive ? Number(performanceMetrics?.openSet || 0) : 0;
              const closedCount = showingLive ? Number(performanceMetrics?.closedSet || 0) : 0;
              const openDots = Array.from({ length: Math.min(openCount, 10) });
              const closedDots = Array.from({ length: Math.min(closedCount, 10) });
              return (
                <>
                  <div className="set-box open">
                    <div className="set-header">
                      <span className="set-badge open">Open</span>
                      <span className="set-count">{openCount}</span>
                    </div>
                    <div className="set-dots">
                      {openDots.map((_, i) => (
                        <span key={`o-${i}`} className="dot open" />
                      ))}
                    </div>
                  </div>
                  <div className="set-box closed">
                    <div className="set-header">
                      <span className="set-badge closed">Closed</span>
                      <span className="set-count">{closedCount}</span>
                    </div>
                    <div className="set-dots">
                      {closedDots.map((_, i) => (
                        <span key={`c-${i}`} className="dot closed" />
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="metrics-section">
        <h4>Performance Metrics</h4>
        {!visualizationComplete ? (
          <div className={`metrics-notice ${!isInVisualization ? 'faded' : ''}`} aria-live="polite" aria-disabled={!isInVisualization}
          >
            ⏳ Performance metrics will appear after visualization completes
          </div>
        ) : (
          <div className={`metrics-grid revealed`}>
            <div className="metric-item">
              <div className="metric-label">Execution Time</div>
              <div className="metric-value">{`${metrics.executionTime} ms`}</div>
              <div className="metric-description">Time complexity: {selectedAlgorithm === 'astar' ? 'O(b^d)' : 'O((V+E)logV)'}</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">Visited Nodes</div>
              <div className="metric-value">{metrics.visitedNodes}</div>
              <div className="metric-description">Space complexity: {selectedAlgorithm === 'astar' ? 'O(b^d)' : 'O(V)'}</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">Memory Usage</div>
              <div className="metric-value">{metrics.memoryUsage}</div>
              <div className="metric-description">Estimated heap allocation</div>
            </div>
            {justRevealed && (
              <div className="metrics-updated-badge" aria-live="polite">✓ Updated</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlgorithmSettingsPanel;
