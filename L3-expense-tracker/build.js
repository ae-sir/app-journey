const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const outputPath = path.join(__dirname, 'public', 'js', 'config.js');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(outputPath, `const SUPABASE_URL = '${SUPABASE_URL}';\nconst SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';\n`);

console.log('Config written to public/js/config.js');
