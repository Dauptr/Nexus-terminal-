const https = require('https');
const path = require('path');

const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', blue: '\x1b[34m'
};

// Helper to load env vars from .env if present
const loadEnv = () => {
    require('dotenv').config(); 
};
let ENV = {};
try { ENV = loadEnv(); } catch(e) { /* No dotenv file, proceed */ }

console.log(`${colors.bright}${colors.blue}╔═════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bright}${colors.blue}║  NEXUS AI :: DEPLOYMENT CLI v2.0      ║${colors.reset}`);
console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════╝${colors.reset}\n`);

// 1. Check Environment
console.log(`${colors.blue}[1/5]${colors.reset} Checking environment...`);
if (process.argv.includes('--local')) {
    console.log("Running in local file mode (No upload).");
    console.log(`${colors.green}✔${colors.reset} OK.\n`);
} else {
    console.log(`> GitHub Token: ${ENV.GH_TOKEN ? 'Set (via .env)' : 'Not Set'}`);
    console.log(`> Owner: ${ENV.GH_OWNER || 'Not Set'}`);
    console.log(`> Repo: ${ENV.GH_REPO || 'Not Set'}`);
    
    if (!ENV.GH_TOKEN || !ENV.GH_OWNER || !ENV.GH_REPO) {
        console.log(`${colors.red}✖${colors.reset} Error: Missing Environment Variables (.env).`);
        console.log(`Run: ${colors.yellow}export GH_TOKEN="your_token"${colors.reset}`);
        console.log(`Run: ${colors.yellow}export GH_OWNER="your_username"${colors.reset}`);
        console.log(`Run: ${colors.yellow}export GH_REPO="your_repo_name"${colors.reset}`);
        process.exit(1);
    }
}

// 2. Read File
const filePath = process.argv[2] || 'index.html';
console.log(`${colors.blue}[2/5]${colors.reset} Loading: ${filePath}...`);

let content;
try {
    // Try reading from CLI arg (if provided)
    if (process.argv.length > 3) {
        content = require('fs').readFileSync(filePath, 'utf8');
    } else {
        // Fallback to reading local index.html
        content = require('fs').readFileSync('index.html', 'utf8');
    }
} catch (err) {
    console.log(`${colors.red}✖${colors.reset} Error: Cannot read file. ${err.message}`);
    process.exit(1);
}

// 3. Direct Deployment Logic
async function deploy() {
    console.log(`${colors.yellow}[3/5]${colors.reset} Initiating Deployment...`);
    
    const owner = ENV.GH_OWNER;
    const repo = ENV.GH_REPO;
    const token = ENV.GH_TOKEN;
    const path = 'index.html';
    
    // 4. Get SHA
    let sha = null;
    try {
        console.log(`${colors.blue}[4/6]${colors.reset} Checking Remote SHA...`);
        const fetch = require('node-fetch'); // Requires: npm install node-fetch (or use global fetch in Node 18+)
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { 
            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'Nexus-Cli' } 
        });
        
        if (res.status === 200) {
            const data = await res.json();
            sha = data.sha;
            console.log(`${colors.green}✔${colors.reset} Remote SHA: ${sha}`);
        } else if (res.status === 404) {
            console.log(`${colors.yellow}!${colors.reset} File not found (New Repo).`);
        } else {
            console.log(`${colors.yellow}!${colors.reset} Could not check SHA (Proceeding blindly).`);
        }
    } catch (e) {
        console.log(`${colors.yellow}!${colors.reset} SHA Check failed: ${e.message}`);
    }

    // 5. Push
    console.log(`${colors.blue}[5/6]${colors.reset} Pushing to GitHub...`);
    
    const encodedContent = Buffer.from(content).toString('base64');
    const message = `Deploy Nexus AI Build via CLI [${new Date().toISOString()}]`;

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `token ${token}`,
                'User-Agent': 'Nexus-Cli',
                'Content-Type': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({ message, content: encodedContent, sha })
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`${colors.green}╔═════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.green}║     ✓ DEPLOYMENT SUCCESS!      ║${colors.reset}`);
            console.log(`${colors.green}╚═══════════════════════════════════╝${colors.reset}\n`);
            console.log(`${colors.blue}> Commit: ${data.commit.sha.substring(0,7)}`);
            console.log(`${colors.blue}> Live URL: https://${owner}.github.io/${repo}/`);
        } else {
            const err = await res.json();
            console.log(`${colors.red}✖ Deployment Failed: ${err.message || `HTTP ${res.status}`}`);
            if(err.message && err.message.includes("too many files")) {
                console.log(`${colors.red}⚠️ ${colors.reset} HIT 100 FILE LIMIT.`);
                console.log(`${colors.yellow}>${colors.reset} Delete the repo on GitHub.com and recreate it to reset the limit.`);
            }
        }
    } catch (e) {
        console.log(`${colors.red}✖ Request Error: ${e.message}`);
    }
}

// Main Entry
const cmd = process.argv[2] || 'deploy';

if (cmd === 'deploy') {
    deploy();
} else {
    console.log(`Usage: node cli.js deploy`);
    console.log(`Options: --local (use local file)`);
    console.log(`Env vars: GH_TOKEN, GH_OWNER, GH_REPO`);
}
