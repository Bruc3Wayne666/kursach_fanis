const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'project_dump.txt';
const EXCLUDE_DIRS = new Set([
    'node_modules', '.git', 'android', 'ios',
    'build', '.gradle', '.idea', 'assets', 'dist'
]);
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.env']);

// Очищаем файл перед записью
fs.writeFileSync(OUTPUT_FILE, '');

function collectFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!EXCLUDE_DIRS.has(file)) {
                collectFiles(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (EXTENSIONS.has(ext) && file !== OUTPUT_FILE && file !== 'package-lock.json') {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const relPath = path.relative(process.cwd(), fullPath);

                    const header = `\n\n// ${'#'.repeat(40)}\n// FILE: ${relPath}\n// ${'#'.repeat(40)}\n\n`;

                    fs.appendFileSync(OUTPUT_FILE, header + content);
                    console.log(`✅ Добавлен: ${relPath}`);
                } catch (err) {
                    console.error(`❌ Ошибка чтения ${fullPath}: ${err.message}`);
                }
            }
        }
    });
}

console.log('🚀 Собираю код проекта...');
collectFiles('.');
console.log(`\nГотово! Весь код собран в: ${OUTPUT_FILE}`);