#!/bin/sh
mkdir -p /app/logs
exec node /app/server.js >> /app/logs/app.log 2>&1
