import 'dotenv/config';
import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password.util';

async function main() {
  console.log('Starting seed...');

  // Ensure we have an active academic year
  let academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        year: '2026-2027',
        isActive: true,
      },
    });
    console.log(`Created Academic Year: ${academicYear.year}`);
  } else {
    console.log(`Using Academic Year: ${academicYear.year}`);
  }

  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  const personas = [
    { email: 'test1@iitg.ac.in', name: 'Test Persona 1', rollNumber: '26010001' },
    { email: 'test2@iitg.ac.in', name: 'Test Persona 2', rollNumber: '26010002' },
    { email: 'test3@iitg.ac.in', name: 'Test Persona 3', rollNumber: '26010003' },
    { email: 'test4@iitg.ac.in', name: 'Test Persona 4', rollNumber: '26010004' },
    { email: 'test5@iitg.ac.in', name: 'Test Persona 5', rollNumber: '26010005' },
  ];

  // Clean up old test data first (both @outlook.com and @iitg.ac.in)
  const allTestEmails = [
    ...personas.map(p => p.email),
    'test1@outlook.com', 'test2@outlook.com', 'test3@outlook.com', 'test4@outlook.com', 'test5@outlook.com'
  ];
  
  await prisma.user.deleteMany({
    where: {
      email: { in: allTestEmails }
    }
  });

  for (const p of personas) {
    // Upsert User — keyed on email since that is now the login identifier
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        passwordHash: hashedPassword,
        mustChangePassword: false, // Don't force password change for testing
        isActive: true,
        role: 'STUDENT',
      },
      create: {
        loginId: p.email, // loginId mirrors email for backwards-compat with the unique constraint
        email: p.email,
        passwordHash: hashedPassword,
        mustChangePassword: false,
        isActive: true,
        role: 'STUDENT',
      },
    });

    // Upsert Student
    await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        name: p.name,
        rollNumber: p.rollNumber,
        branch: 'Computer Science and Engineering',
        email: p.email,
        academicYearId: academicYear.id,
      },
      create: {
        userId: user.id,
        name: p.name,
        rollNumber: p.rollNumber,
        branch: 'Computer Science and Engineering',
        email: p.email,
        academicYearId: academicYear.id,
      },
    });

    console.log(`Upserted Persona: ${p.email}`);
  }

  console.log('\nSeed completed successfully.');
  console.log('You can log in using:');
  console.log('Emails: test1@iitg.ac.in through test5@iitg.ac.in');
  console.log(`Password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
