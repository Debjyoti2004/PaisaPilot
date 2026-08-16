#!/bin/bash
# Kill anything on port 3000, then start dev server
lsof -ti:3000 | xargs kill -9 2>/dev/null; true
npm run dev
