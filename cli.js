const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m'
};

console.log(`${colors.bright}${colors.blue}╔════════════════════════════╗${colors.reset}`);
console.log(`${colors.bright}${colors.blue}║   NEXUS AI :: DEPLOYMENT CLI v2.1 ║${colors.reset}`);
console.log(`${colors.bright}${colors.blue}╚══════════════════════════════╝${colors.reset}\n`);

// Check File
const checkFile = (file) => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`${colors.red}✖ Error: ${file} not found in current directory.${colors.reset}`);
        process.exit(1);
    }
};

// Main Deployment Logic
async function deploy() {
    console.log(`${colors.blue}[1/5]${colors.reset} Initiating Deployment...`);
    
    let contentToDeploy = null;
    let sourceDescription = "Current Source (Live)"; // Default

    // 1. Check for Local CLI Artifact (If user used npm run prepare)
    const localArtifact = 'BUILD_ARTIFACT.html'; // File saved by user
    if (fs.existsSync(localArtifact)) {
        contentToDeploy = fs.readFileSync(localArtifact, 'utf8');
        sourceDescription = "Prepared Artifact (Fixed Code)";
        console.log(`${colors.green}✔${colors.reset} Found build artifact: BUILD_ARTIFACT.html`);
    }

    // 2. If no artifact, use index.html
    if (!contentToDeploy) {
        contentToDeploy = fs.readFileSync('index.html', 'utf8');
        sourceDescription = "index.html (Raw Source)";
        console.log(`${colors.yellow}!${colors.reset} No artifact found. Deploying index.html directly.`);
    }

    // 3. Configuration (Env vars > Manual input)
    const token = process.env.GH_TOKEN || (process.argv.includes('--token') ? process.argv[process.argv.indexOf('--token') + 1] : null);
    const owner = process.env.GH_OWNER || "dauptr"; 
    const repo = process.env.GH_REPO || "Rodo-su-pollinations-"; 

    if (!token) {
        console.log(`${colors.red}✖ Error: Missing GitHub Token.${colors.reset}`);
        console.log(`Solution A: Use the Nexus AI App "Connect" wizard to generate a token easily.`);
        console.log(`Solution B: Run with: ${colors.blue}node cli.js deploy --token YOUR_TOKEN${colors.reset}`);
        console.log(`Solution C: Set env var: ${colors.yellow}export GH_TOKEN=...${colors.reset}`);
        process.exit(1);
    }

    // 4. Push
    console.log(`${colors.blue}[4/5]${colors.reset} Target: ${owner}/${repo}/gh-pages...`);
    console.log(`> Reading ${sourceDescription}...`);

    const encodedContent = Buffer.from(contentToDeploy).toString('base64');
    let sha = null;

    try {
        // 5. Check Remote SHA (Dry Run)
        sha = getRemoteSha(owner, repo, token);
        
        // 6. Upload
        const message = `Deploy Nexus AI Build via CLI [${new Date().toISOString()}]`;
        const payload = { message: message, content: encodedContent, sha: sha };
        
        const req = require('https').request(`https://api.github.com/repos/${owner}/${repo}/contents/index.html`, {
            method: 'PUT',
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${owner}/${repo}/contents/index.html`,
            headers: { 
                'Authorization': `token ${token}`,
                'User-Agent': 'Nexus-Cli/2.1',
                'Content-Type': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(payload)
        });

        req.on('response', (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`${colors.green}╔════════════════════════════╗${colors.reset}`);
                    console.log(`${colors.green}║     ✓ DEPLOYMENT SUCCESS!      ║${colors.reset}`);
                    console.log(`${colors.green}╚══════════════════════════════╝${colors.reset}\n`);
                    console.log(`Commit: ${JSON.parse(body).commit.sha.substring(0,7)}`);
                    console.log(`Live URL: https://${owner}.github.io/${repo}/`);
                    
                    // Cleanup artifact if used
                    if (sourceDescription.includes("Artifact")) {
                        fs.unlinkSync(localArtifact);
                        console.log(`${colors.blue}i${colors.reset} Cleaned up BUILD_ARTIFACT.html`);
                    }
                    process.exit(0);
                } else {
                    const err = JSON.parse(body);
                    console.log(`${colors.red}✖ Deployment Failed: ${err.message || `HTTP ${res.statusCode}`}`);
                    if (err.message && err.message.includes("too many files")) {
                        console.log(`${colors.red}⚠️ ${colors.reset} GitHub 100 File Limit.`);
                        console.log(`${colors.yellow}>>${colors.reset} Run 'node cli.js deploy --reset' to clear your repo.`);
                    }
                    process.exit(1);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`${colors.red}✖ Request Error: ${e.message}`);
            process.exit(1);
        });

        req.write(JSON.stringify(payload.body));
        req.end();

    } catch (e) {
        console.log(`${colors.red}✖ Deployment Failed: ${e.message}`);
        process.exit(1);
    }
}

// Helper
function getRemoteSha(owner, repo, token) {
    try {
        const https = require('https');
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${owner}/${repo}/contents/index.html`,
            method: 'GET',
            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'Nexus-Cli' }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    return response.sha;
                } else if (res.statusCode === 404) {
                    return null;
                }
            });
        });

        req.on('error', () => { return null; });
        req.end();
    } catch (e) {
        return null;
    }
}

// Main
const cmd = process.argv[2] || 'deploy';
if (cmd === 'deploy') {
    deploy();
} else if (cmd === 'reset') {
    console.log(`${colors.yellow}> WARNING: ${colors.reset} Reset command not supported by this CLI.`);
    console.log(`${colors.blue}>${colors.reset} Use GitHub UI to delete files if you hit limits.`);
    process.exit(1);
} else {
    console.log(`Usage: node cli.js deploy`);
    console.log(`Env: GH_TOKEN, GH_OWNER, GH_REPO`);
    process.exit(1);
}
