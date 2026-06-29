import { config } from 'dotenv';
config({ path: './.env' });

import { prisma } from './src/config/prisma';

async function main() {
  console.log('Deleting existing users to prepare for schema migration...');
  const deleted = await prisma.user.deleteMany({});
  console.log(`Deleted ${deleted.count} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
