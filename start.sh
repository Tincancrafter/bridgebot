#!/bin/bash

echo "Creating config.json from Railway variables..."

echo "$CONFIG_JSON" > config.json
echo "$CONFIG_JSON" > ../config.json

echo "Starting application..."
node index.js
