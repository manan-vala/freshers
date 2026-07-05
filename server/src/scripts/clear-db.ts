import 'dotenv/config';
import { prisma } from '../config/prisma';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function clearDatabase() {
  console.log('Fetching tables...');
  try {
    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations'`;

    const tables = tablenames.map(({ tablename }) => `"${tablename}"`).join(', ');

    if (tables.length === 0) {
      console.log('No tables to truncate.');
      return;
    }

    console.log(`Truncating tables: ${tables}`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    
    console.log('Database cleared successfully.');
  } catch (error) {
    console.error('Failed to clear database:', error);
  }
}

rl.question('\nWARNING: This will permanently delete ALL data in the database.\nAre you sure you want to proceed? Type "yes" to confirm: ', async (answer) => {
  if (answer.trim().toLowerCase() === 'yes') {
    await clearDatabase();
  } else {
    console.log('Database clear aborted.');
  }
  
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});
