@echo off
setlocal enabledelayedexpansion

echo Compiling C++ code...
g++ -std=c++17 -I. main.cpp Graph.cpp Dijkstra.cpp -o dijkstra.exe

if %ERRORLEVEL% EQU 0 (
    echo Build successful! dijkstra.exe created.
) else (
    echo Build failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
