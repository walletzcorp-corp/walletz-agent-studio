const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Load root .env so Prisma finds DATABASE_URL in the monorepo
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

function psql(adminUrl, sql) {
  const result = spawnSync('psql', [adminUrl, '-c', sql, '-t', '--no-psqlrc'], {
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  if (!adminUrl || !dbUrl) return;

  const url = new URL(dbUrl);
  const dbName = url.pathname.replace(/^\//, '').replace(/\?.*$/, '');
  const appUser = url.username;
  const appPass = decodeURIComponent(url.password);

  console.log(`Setting up database "${dbName}" for user "${appUser}"...`);

  // Create user if not exists
  const userRow = psql(adminUrl, `SELECT 1 FROM pg_roles WHERE rolname='${appUser}'`);
  if (!userRow) {
    psql(adminUrl, `CREATE USER ${appUser} WITH PASSWORD '${appPass.replace(/'/g, "''")}'`);
    console.log(`  Created user ${appUser}`);
  }

  // Create target database if not exists
  const dbRow = psql(adminUrl, `SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
  if (!dbRow) {
    psql(adminUrl, `CREATE DATABASE ${dbName} OWNER ${appUser}`);
    console.log(`  Created database ${dbName}`);
  } else {
    psql(adminUrl, `GRANT ALL ON DATABASE ${dbName} TO ${appUser}`);
  }

  // Create shadow database if set
  const shadowUrl = process.env.DATABASE_URL_SHADOW;
  if (shadowUrl) {
    const shadowName = new URL(shadowUrl).pathname.replace(/^\//, '').replace(/\?.*$/, '');
    const shadowRow = psql(adminUrl, `SELECT 1 FROM pg_database WHERE datname='${shadowName}'`);
    if (!shadowRow) {
      psql(adminUrl, `CREATE DATABASE ${shadowName}`);
      console.log(`  Created shadow database ${shadowName}`);
    }
    psql(adminUrl, `GRANT ALL ON DATABASE ${shadowName} TO ${appUser}`);
  }

  // Grant public schema privileges in target DB
  const adminDbUrl = adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}`);
  psql(adminDbUrl, `GRANT ALL ON SCHEMA public TO ${appUser}`);
  psql(adminDbUrl, `ALTER SCHEMA public OWNER TO ${appUser}`);
  console.log(`  Granted schema privileges to ${appUser}`);
}

function main() {
  try {
    setupDatabase();
  } catch (err) {
    console.warn(`DB setup skipped: ${err.message}`);
  }

  const cmd = process.argv[2] || 'deploy';
  const args = process.argv.slice(3).join(' ');

  execSync(`prisma migrate ${cmd} ${args}`, {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..'),
  });
}

main();
