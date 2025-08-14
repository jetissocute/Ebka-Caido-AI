# Overview
Local connector for caido ebka plugin

# Requirements for installation
NodeJS 16+

# Installation
Install dependency and build:
```bash
git clone https://github.com/Slonser/Ebka-Caido-AI.git
cd Ebka-Caido-AI/claude-mcp-server
npm install
npm run build
```

Add to claude desktop config:
Linux/Macos path - code ~/Library/Application\ Support/Claude/claude_desktop_config.json
Windows: code $env:AppData\Claude\claude_desktop_config.json
```json
   {
     "mcpServers": {
       "caido": {
         "command": "node",
         "args": ["/path/to/claude-mcp-server/build/index.js"]
       }
     }
   }
```