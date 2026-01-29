#!/bin/bash

# Monitor backend requests in real-time
echo "🔍 Monitoring backend requests..."
echo "Click 'Detect Anomalies' in your browser now..."
echo ""
echo "Watching server.log for API requests..."
echo "Press Ctrl+C to stop"
echo ""

tail -f server.log 2>/dev/null | grep --line-buffered -E "\[API|jobId|currentStep|Status|202|POST|GET" | while read line; do
  timestamp=$(date '+%H:%M:%S')
  echo "[$timestamp] $line"
done
