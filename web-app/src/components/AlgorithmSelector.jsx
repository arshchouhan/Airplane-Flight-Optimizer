import React from 'react';
import '../styles/AlgorithmSelector.css';

const algorithms = [
  { id: 'dijkstra', name: 'Dijkstra' },
  { id: 'astar', name: 'A*' }
];

const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }) => {
  const handleDoubleClick = (algo) => {
    if (selectedAlgorithm === algo.id) {
      // Only trigger panel on double-click of selected algorithm
      onAlgorithmChange(algo.id, true); // Pass true for isDoubleClick
    }
  };

  const handleSingleClick = (algo) => {
    // Only change selection, don't trigger panel
    if (selectedAlgorithm !== algo.id) {
      onAlgorithmChange(algo.id, false); // Pass false for isDoubleClick
    }
  };

  return (
    <div className="algorithm-selector">
      <h3>Pathfinding <span className="required">*</span></h3>
      <div className="algorithm-options">
        {algorithms.map((algo) => (
          <label 
            key={algo.id} 
            className={`algorithm-option ${!selectedAlgorithm ? 'unselected' : ''}`}
            onClick={() => handleSingleClick(algo)}
            onDoubleClick={() => handleDoubleClick(algo)}
          >
            <input
              type="radio"
              name="pathfinding-algorithm"
              value={algo.id}
              checked={selectedAlgorithm === algo.id}
              onChange={() => {}} // Prevent default onChange
              required
            />
            <span>{algo.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default AlgorithmSelector;
