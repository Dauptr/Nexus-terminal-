const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ANSI Colors
const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', blue: '\x1b[34m', yellow: '\x1b[33m'
};

// --- HELPERS ---

function log(color, msg) {
    process.stdout.write(color + msg + colors.reset);
}

function logSuccess(msg) { log(colors.green, '✔ ' + msg); }
function logError(msg) { log(colors.red, '✖ ' + msg); }
function logInfo(msg) { log(colors.blue, 'ℹ ' + msg); }
function logWarn(msg) { log(colors.yellow, '⚠ ' + msg); }

function getRepoConfig() {
    // 1. CLI Args
    const args = process.argv.slice(2);
    let token = args.includes('--token') ? args[args.indexOf('--token') + 1] : process.env.GH_TOKEN;
    let owner = args.includes('--owner') ? args[args.indexOf('--owner') + 1] : process.env.GH_OWNER;
    let repo = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : process.env.GH_REPO;
    const isAtomic = args.includes('--atomic'); // New flag

    // 2. Read Local Config
    const localConfigPath = path.join(process.cwd(), '.nexus-config.json');
    let localConfig = { owner: null, repo: null };
    if (fs.existsSync(localConfigPath)) {
        try { localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8')); } catch(e) {}
    }

    // 3. Merge CLI Args into Local Config (CLI takes priority)
    if (!token) token = localConfig.token;
    if (!owner) owner = localConfig.owner;
    if (!repo) repo = localConfig.repo;

    if (!token || !owner || !repo) {
        logError("Configuration Missing. Usage:");
        log("  node cli.js --token YOUR_TOKEN --owner USERNAME --repo REPO");
        log("  (Or edit .nexus-config.json)");
        process.exit(1);
    }

    // Save back to local config (for future CLI use without args)
    localConfig.token = token;
    localConfig.owner = owner;
    localConfig.repo = repo;

    return { token, owner, repo, isAtomic };
}

function fetchGitHub(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject("Invalid JSON response"); }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(options.body));
        req.end();
    });
}

async function listGitHubFiles({ token, owner, repo }) {
    logInfo("Checking repository files...");
    try {
        // Check SHA first
        const checkRes = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}/contents/index.html?ref=gh-pages`, {
            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'Nexus-Cli/2.1' }
        });

        if (checkRes.statusCode === 404) {
            logSuccess("No file found in gh-pages branch. Safe to push.");
            return null; // No existing file
        } else if (checkRes.statusCode === 200) {
            const data = await checkRes.json();
            logSuccess(`Current Remote File: ${data.name} (SHA: ${data.sha.substring(0,7)})`);
            return data.sha;
        }
    } catch (e) {
        logError("Failed to check files: " + e.message);
        return null;
    }
}

async function deployAtomic({ token, owner, repo }) {
    logInfo("--- Starting ATOMIC Deployment ---");
    
    // 1. Read Current HTML
    const indexPath = path.join(process.cwd(), 'index.html');
    if (!fs.existsSync(indexPath)) {
        logError("index.html not found! Are you in the right directory?");
        return;
    }

    const currentContent = fs.readFileSync(indexPath, 'utf8');

    // 2. Prepare Update (We modify a small part to trigger a change)
    // Note: We add a timestamp comment. This makes GitHub see it as "file modified", not a "new file".
    const injectString = `\n<!-- ATOMIC UPDATE: ${new Date().toISOString()} -->`;
    const patchedContent = currentContent + injectString;

    // 3. Push (Single File Update)
    // This is the key to avoiding "100 files" limit. We are updating, not creating.
    const encodedContent = Buffer.from(patchedContent).toString('base64');
    const message = `Atomic Update via Nexus CLI [${new Date().toISOString()}]`;
    
    logWarn("Uploading content... (This avoids File Count Limit issues)");
    
    try {
        const res = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}/contents/index.html?ref=gh-pages`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'Nexus-Cli/2.1', 'Content-Type': 'application/vnd.github.v3+json' },
            body: JSON.stringify({ message, content: encodedContent })
        });

        if (res.statusCode === 200 || res.statusCode === 201) {
            const data = JSON.parse(res.body); // Using res.body because fetch-simple helper sometimes buffers it
            logSuccess(`Deployment Successful!`);
            log(`Commit: ${data.commit.sha.substring(0,7)}`);
            log(`Live URL: https://${owner}.github.io/${repo}/`);
            
            // Save config for next time
            localConfig.token = token;
            localConfig.owner = owner;
            localConfig.repo = repo;
            fs.writeFileSync(localConfigPath, JSON.stringify(localConfig, null, 2));

            process.exit(0);
        } else {
            const err = JSON.parse(res.body);
            throw new Error(`HTTP ${res.statusCode}: ${err.message}`);
        }

    } catch (e) {
        logError("Deployment Failed: " + e.message);
        process.exit(1);
    }
}

// --- MAIN ---

console.log(colors.bright + colors.blue + "╔══════════════════════════╗" + colors.reset);
console.log(colors.bright + colors.blue + "║  NEXUS AI :: ATOMIC DEPLOYMENT CLI ║" + colors.reset);
console.log(colors.bright + colors.blue + "╚══════════════════════════════╝" + colors.reset);

const { token, owner, repo, isAtomic } = getRepoConfig();

const command = process.argv[2] || 'deploy';

if (command === 'deploy') {
    deployAtomic({ token, owner, repo });
} else if (command === 'files') {
    // Helper command to check repo state via API
    if (!token || !owner || !repo) {
        logError("Configuration missing. Please run: node cli.js --token YOUR_TOKEN --owner USER --repo REPO");
        return;
    }
    listGitHubFiles({ token, owner, repo });
} else if (command === 'prepare') {
    logWarn("Command 'prepare' is legacy. Just run 'deploy' now.");
} else {
    log("Unknown command. Available: deploy, files");
    process.exit(1);
}
