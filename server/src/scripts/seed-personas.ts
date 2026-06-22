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
    { loginId: 'test1', email: 'test1@outlook.com', name: 'Test Persona 1', rollNumber: '26010001' },
    { loginId: 'test2', email: 'test2@outlook.com', name: 'Test Persona 2', rollNumber: '26010002' },
    { loginId: 'test3', email: 'test3@outlook.com', name: 'Test Persona 3', rollNumber: '26010003' },
    { loginId: 'test4', email: 'test4@outlook.com', name: 'Test Persona 4', rollNumber: '26010004' },
    { loginId: 'test5', email: 'test5@outlook.com', name: 'Test Persona 5', rollNumber: '26010005' },
  ];

  for (const p of personas) {
    // Upsert User
    const user = await prisma.user.upsert({
      where: { loginId: p.loginId },
      update: {
        email: p.email,
        passwordHash: hashedPassword,
        mustChangePassword: false, // Don't force password change for testing
        isActive: true,
        role: 'STUDENT',
      },
      create: {
        loginId: p.loginId,
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

    console.log(`Upserted Persona: ${p.loginId} (Email: ${p.email})`);
  }

  console.log('\nSeed completed successfully.');
  console.log('You can log in using:');
  console.log('Login IDs: test1, test2, test3, test4, test5');
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
