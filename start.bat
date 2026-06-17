@echo off
echo iTopik Admin Panel - Local Server
echo ==================================
echo.
echo Server is starting at http://localhost:8080
echo Open your browser and go to http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.
python3 -m http.server 8080
pause
