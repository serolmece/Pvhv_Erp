const { execSync } = require('child_process');

console.log("Building frontend...");
execSync("npm run build", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp/frontend", stdio: 'inherit' });

console.log("Preparing deployment folder...");
execSync("rm -rf PvhvErp_Guncelleme PvhvErp_Guncelleme.zip", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });
execSync("mkdir PvhvErp_Guncelleme", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Copying backend...");
execSync("rsync -av --exclude='node_modules' --exclude='.env' --exclude='test_*.js' --exclude='change_to_float*.js' --exclude='add_column*.js' --exclude='check_*.js' --exclude='create_*.js' --exclude='delete_*.js' --exclude='fix_*.js' --exclude='reproduce_*.js' --exclude='setupDb.js' --exclude='updateDb.js' --exclude='testLogin.js' --exclude='checkUser.js' --exclude='createAdmin.js' --exclude='*.sql' --exclude='*_runner.js' --exclude='.*' backend/ PvhvErp_Guncelleme/", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Copying frontend dist to BOTH public folder (For Node.js) and root (For IIS)...");
// 1. Root (Just in case IIS is serving it directly)
execSync("rsync -av --exclude='.*' frontend/dist/ PvhvErp_Guncelleme/", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });
// 2. public folder (Because index.js serves from path.join(__dirname, 'public'))
execSync("mkdir -p PvhvErp_Guncelleme/public");
execSync("rsync -av --exclude='.*' frontend/dist/ PvhvErp_Guncelleme/public/", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Removing Mac hidden files...");
execSync("find PvhvErp_Guncelleme -name '._*' -delete", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });
execSync("find PvhvErp_Guncelleme -name '.DS_Store' -delete", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Adding production web.config...");
execSync("cp backend/web.config.production PvhvErp_Guncelleme/web.config", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Zipping files...");
execSync("cd PvhvErp_Guncelleme && zip -r -q ../PvhvErp_Guncelleme.zip . -x '*/\\.*'", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Cleaning up...");
execSync("rm -rf PvhvErp_Guncelleme", { cwd: "/Volumes/Extreme SSD/Projects/PvhvErp" });

console.log("Process completed! PvhvErp_Guncelleme.zip created.");
