const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m'
};

console.log(`${colors.bright}${colors.blue}╔════════════════════════════╗${colors.reset}`);
console.log(`${colors.bright}${colors.blue}║   NEXUS AI :: DEPLOYMENT CLI v1.0   ║${colors.reset}`);
console.log(`${colors.bright}${colors.blue}╚══════════════════════════╝${colors.reset}\n`);

const checkFile = (file) => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`${colors.red}✖ Error: ${file} not found in current directory.${colors.reset}`);
        process.exit(1);
    }
};

const runCommand = (command, silent = false) => {
    try {
        if (silent) { execSync(command, { stdio: 'pipe' }); } 
        else { console.log(`${colors.yellow}→ Running: ${command}${colors.reset}`); execSync(command, { stdio: 'inherit' }); }
    } catch (error) {
        console.log(`${colors.red}✖ Command failed: ${command}${colors.reset}`);
        process.exit(1);
    }
};

// 1. Check Environment
console.log(`${colors.blue}[1/5]${colors.reset} Verifying environment...`);
checkFile('index.html');
checkFile('package.json');
console.log(`${colors.green}✔${colors.reset} Project files detected.\n`);

// 2. Check Git Repository
console.log(`${colors.blue}[2/5]${colors.reset} Checking Git status...`);
try {
    const gitUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    console.log(`${colors.green}✔${colors.reset} Remote: ${gitUrl}\n`);
} catch (error) {
    console.log(`${colors.red}✖ Not a Git repository. Run 'git init' and link your repo first.${colors.reset}`);
    process.exit(1);
}

// 3. Install Dependencies
const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
if (!nodeModulesExists) {
    console.log(`${colors.blue}[3/5]${colors.reset} Installing dependencies (NPM)...`);
    runCommand('npm install --silent');
} else {
    console.log(`${colors.blue}[3/5]${colors.reset} Dependencies already installed. Skipping.\n`);
}

// 4. Prepare Build
console.log(`${colors.blue}[4/5]${colors.reset} Preparing build...`);
// You could add minification logic here if desired using html-minifier-terser
console.log(`${colors.green}✔${colors.reset} Build prepared (Static HTML).\n`);

// 5. Deploy
