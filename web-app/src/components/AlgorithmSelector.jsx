import React from 'react';
import '../styles/AlgorithmSelector.css';

const algorithms = [
  { id: 'dijkstra', name: 'Start Pathfinding' }
];

const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }) => {
  return (
    <div className="algorithm-selector">
      <h3>Pathfinding <span className="required">*</span></h3>
      <div className="algorithm-options">
        {algorithms.map((algo) => (
          <label 
            key={algo.id} 
            className={`algorithm-option ${!selectedAlgorithm ? 'unselected' : ''}`}
            onClick={(e) => {
              if (selectedAlgorithm === algo.id) {
                e.preventDefault();
                onAlgorithmChange(algo.id);
              }
            }}
          >
            <input
              type="radio"
              name="pathfinding-algorithm"
              value={algo.id}
              checked={selectedAlgorithm === algo.id}
              onChange={() => onAlgorithmChange(algo.id)}
              required
              onClick={(e) => e.stopPropagation()}
            />
            <span>{algo.name}</span>
          </label>
        ))}
        <div className="instructions">
          <p>How to use:</p>
          <ol>
            <li>Select two airports on the map</li>
            <li>Click "Start Pathfinding" to find the shortest route</li>
            <li>Watch the animation to see the path being discovered</li>
          </ol>
          <p className="note">Tip: Click on any airport to see flight information</p>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmSelector;
