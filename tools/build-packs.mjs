import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const moduleDir = path.join(repoRoot, 'modules', 'PurplePhoenix-FVTT-Tools');
const macrosSrcDir = path.join(__dirname, 'macros-src');
const packDir = path.join(moduleDir, 'packs', 'purplephoenix-macros');

const CLASSIC_LEVEL_CANDIDATES = [
    process.env.CLASSIC_LEVEL_PATH,
    'G:\\My Drive\\Desktop\\DnD\\FVTT\\FoundryVTT-WindowsPortable-14.370\\App\\resources\\app\\node_modules\\classic-level',
    'classic-level'
].filter(Boolean);

const require = createRequire(import.meta.url);
function loadClassicLevel() {
    for (const candidate of CLASSIC_LEVEL_CANDIDATES) {
        try {
            return require(candidate).ClassicLevel;
        } catch (_err) {
            // Try next candidate
        }
    }
    throw new Error('Could not load classic-level. Set CLASSIC_LEVEL_PATH to Foundry resources/app/node_modules/classic-level.');
}

async function buildMacroPack() {
    const ClassicLevel = loadClassicLevel();
    const indexPath = path.join(macrosSrcDir, 'index.json');
    const entries = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    // Rebuild cleanly so removed macros never linger in LevelDB
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });

    const now = Date.now();
    const db = new ClassicLevel(packDir, { valueEncoding: 'json' });
    await db.open();

    try {
        for (const meta of entries) {
            const cmdPath = path.join(macrosSrcDir, `${meta.slug}.js`);
            const command = fs.readFileSync(cmdPath, 'utf8').replace(/\r\n/g, '\n').trimEnd();

            // Validate macro command syntax inside an async function wrapper (matches Foundry execution)
            new Function(`return async () => {\n${command}\n}`);

            const doc = {
                _id: meta._id,
                name: meta.name,
                type: meta.type || 'script',
                author: null,
                img: meta.img,
                scope: meta.scope || 'global',
                command,
                folder: null,
                sort: meta.sort ?? 0,
                ownership: { default: 0 },
                flags: {},
                _stats: {
                    coreVersion: '14.370',
                    systemId: 'dnd5e',
                    systemVersion: '6.1.1',
                    createdTime: now,
                    modifiedTime: now,
                    lastModifiedBy: null,
                    compendiumSource: null,
                    duplicateSource: null,
                    exportSource: null
                }
            };

            await db.put(`!macros!${doc._id}`, doc);
        }
    } finally {
        await db.close();
    }

    console.log(`Built ${entries.length} macros into ${packDir}`);
}

buildMacroPack().catch(err => {
    console.error(err);
    process.exit(1);
});
