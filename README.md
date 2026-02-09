NEXUS AI // Full Stack Project

The Ultimate Neural Interface
A self-contained, single-page web application featuring a Virtual Operating System, AI Chat, Game Engine, and Terminal-based Deployment.

📋 Features

🔮 Nexus AI Chat: LLM integration (Groq, DeepSeek, Zhipu, Pollinations) with markdown rendering.
🎮 Nexus Engine V2: 2D Platformer game creator with Entity Fabricator and AI Level Generation.
⚡ Playground A: Advanced image generation tool (Flux, Turbo, SDXL) with prompt history and "Image Z" variate/zoom tools.
💻 System Terminal: In-app CLI with Virtual File System (VFS). Supports ls, cat, npm install, and deploy.
📡 WebRTC / P2P: Real-time video calls and file sharing between users in the same room.
📻 IDE & Copilot: Built-in code editor with auto-fix capabilities.
📻 GitHub Integration: Direct deployment via GitHub API (no CLI required).
🚀 Quick Start

1. Installation (Local)

Clone the repository and install dependencies for the optional CLI tools:

git clone https://github.com/dauptr/nexus-ai.gitcd nexus-ainpm install
 2. Usage

 Start Local Server:
bash

npm start
 (Opens http://localhost:3000 for development)
 Direct Open: Simply open index.html in your browser.
 🖥 System Commands (Terminal)

The in-app terminal (press 💻 TERMINAL button) allows you to control the application's internal state without a backend.

COMMAND
 DESCRIPTION
 help	List all available commands.
ls	List files in the Virtual File System.
cat [filename]	Read the content of a file in memory.
touch [filename]	Create a new empty file in memory.
npm install	Simulate installing build dependencies into node_modules. Required for build.
npm run build	Validate HTML and create a build_artifact in memory. Required for deploy.
deploy	Push the current build_artifact to the configured GitHub repository.
status	Check system health, memory usage, and repo configuration.
clear	Clear the terminal screen.
exit	Close the terminal overlay.
 
 Note: deploy requires a Build Artifact to exist. Always run npm run build before deploying to ensure you are pushing a validated version.

 🚢 Deployment Guide

This project supports Serverless Deployment. You can publish directly from the UI or via the CLI.

Method A: UI Deployment (Easiest)

Open Nexus AI in your browser.
Click 🖋 IDE (Top right).
Click ⚙️ REPO SETTINGS (Gear icon).
Enter your GitHub Token, Owner, and Repo Name.
Click COMMIT & PUSH.
Method B: CLI Deployment

Ensure you have node_modules installed (npm install).
Run:
bash

npm run deploy
 This executes cli.js, which pushes to the gh-pages branch.
GitHub Pages Configuration

After deploying:

Go to Repository Settings > Pages.
Set Source to Deploy from a branch.
Select Branch: gh-pages.
Select Folder: /(root).
🏗️ Project Structure

text

nexus-ai/
├── index.html        # Main application (Contains HTML, CSS, JS)
├── package.json      # NPM scripts & metadata
├── cli.js           # Local CLI script for developers
└── README.md        # This file
 🛠️ Troubleshooting

 Error: "API Key Missing"
 Open Admin Panel or IDE Repo Settings and enter your LLM key (Groq/DeepSeek/Zhipu).
 Error: "Deployment Failed"
 Ensure you have run npm run build in the terminal.
 Check your GitHub Token scopes (must include repo permission).
 Error: "Build Artifact Not Found"
 This means the VFS doesn't have a build snapshot. Run npm run build in the terminal.
 📄 License

MIT License - See root files for details.

🤖 Credits

 Core System: Rodo
 AI Models: Pollinations.ai
 Frameworks: TailwindCSS, Paho MQTT, Highlight.js
 text

Enter your code here...
