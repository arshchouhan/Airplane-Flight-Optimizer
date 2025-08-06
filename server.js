import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Get the current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname);

const app = express();
app.use(express.json());
app.use(cors());

// Path to the compiled C++ executable
const DIJKSTRA_EXECUTABLE = path.join(PROJECT_ROOT, 'cpp', 'dijkstra.exe');
const GRAPH_FILE = path.join(PROJECT_ROOT, 'web-app', 'public', 'graph.json');

// Log paths for debugging
console.log('Project root:', PROJECT_ROOT);
console.log('Dijkstra executable path:', DIJKSTRA_EXECUTABLE);
console.log('Graph data path:', GRAPH_FILE);

// Verify paths exist
const fs = await import('fs');
if (!fs.existsSync(DIJKSTRA_EXECUTABLE)) {
    console.error(`Error: Dijkstra executable not found at ${DIJKSTRA_EXECUTABLE}`);
    process.exit(1);
}

if (!fs.existsSync(GRAPH_FILE)) {
    console.error(`Error: Graph data file not found at ${GRAPH_FILE}`);
    process.exit(1);
}

// Handle both /api/shortest-path and /shortest-path for compatibility
const handleShortestPath = (req, res) => {
    const { source, target } = req.body;
    
    if (!source || !target) {
        return res.status(400).json({ error: "Source and target airports are required" });
    }

    console.log(`Finding path from ${source} to ${target}`);
    
    // Run C++ program with the graph file path as the third argument
    const command = `"${DIJKSTRA_EXECUTABLE}" "${source}" "${target}" "${GRAPH_FILE}"`;
    console.log('Executing command:', command);
    
    exec(command, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing Dijkstra:', stderr);
            return res.status(500).json({ 
                error: "Error running pathfinding algorithm",
                details: stderr
            });
        }
        
        try {
            const result = JSON.parse(stdout);
            console.log('Path found:', result);
            res.json(result);
        } catch (e) {
            console.error('Error parsing Dijkstra output:', e);
            console.error('Raw output:', stdout);
            res.status(500).json({
                error: "Error parsing pathfinding results",
                details: e.message,
                rawOutput: stdout
            });
        }
    });
};

// Register the endpoint at both paths for compatibility
app.post("/api/shortest-path", handleShortestPath);
app.post("/shortest-path", handleShortestPath);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
