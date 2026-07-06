import 'dotenv/config';
import { prisma } from '../config/prisma';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { seedPersonas } from '../modules/user/seed.service';

async function main() {
  console.log('Starting seed...');

  const rl = readline.createInterface({ input, output });
  const currentYear = new Date().getFullYear();
  const exampleFormat = `${currentYear}-${currentYear + 1}`;
  
  // (Current Year - Next Year)
  let inputYear = await rl.question(`Enter academic year (e.g., ${exampleFormat}): `);
  rl.close();

  if (!inputYear.trim()) {
    inputYear = exampleFormat;
    console.log(`No input provided. Using default: ${inputYear}`);
  } else {
    inputYear = inputYear.trim();
  }

  try {
    const result = await seedPersonas(inputYear);
    
    console.log('\nSeed completed successfully.');
    console.log(`Academic Year: ${result.academicYear}`);
    console.log(`Personas Seeded: ${result.personsSeeded}`);
    console.log('You can log in using:');
    console.log('Emails: test1@iitg.ac.in through test10@iitg.ac.in');
    console.log('Password: Swc_password');
  } catch (error: any) {
    console.error(`\nSeed failed: ${error.message}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
