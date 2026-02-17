#!/bin/bash
echo "$CONFIG_JSON" > /srv/config.json
echo "$CONFIG_JSON" > /config.json 2>/dev/null || true
node index.js
