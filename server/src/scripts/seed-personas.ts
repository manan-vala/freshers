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

  const defaultPassword = 'Swc_password';
  const hashedPassword = await hashPassword(defaultPassword);

  const personas = [
    { email: 'test1@iitg.ac.in', name: 'Test Persona 1', rollNumber: '26010001', hostelName: 'LOHIT_HOSTEL', hostelCode: 'LHT', hostelType: 'BOYS', outlookEmail: 'test1@outlook.com' },
    { email: 'test2@iitg.ac.in', name: 'Test Persona 2', rollNumber: '26010002', hostelName: 'DISANG_HOSTEL', hostelCode: 'DSG', hostelType: 'BOYS', outlookEmail: 'test2@outlook.com' },
    { email: 'test3@iitg.ac.in', name: 'Test Persona 3', rollNumber: '26010003', hostelName: 'SUBANSIRI_HOSTEL', hostelCode: 'SBN', hostelType: 'GIRLS', outlookEmail: 'test3@outlook.com' },
    { email: 'test4@iitg.ac.in', name: 'Test Persona 4', rollNumber: '26010004', hostelName: 'UMIAM_HOSTEL', hostelCode: 'UMM', hostelType: 'BOYS', outlookEmail: 'test4@outlook.com' },
    { email: 'test5@iitg.ac.in', name: 'Test Persona 5', rollNumber: '26010005', hostelName: 'DHANSIRI_HOSTEL', hostelCode: 'DHS', hostelType: 'GIRLS', outlookEmail: 'test5@outlook.com' },
    { email: 'test6@iitg.ac.in', name: 'Test Persona 6', rollNumber: '26010006', hostelName: 'MANAS_HOSTEL', hostelCode: 'MNS', hostelType: 'BOYS', outlookEmail: 'test6@outlook.com' },
    { email: 'test7@iitg.ac.in', name: 'Test Persona 7', rollNumber: '26010007', hostelName: 'KAMENG_HOSTEL', hostelCode: 'KMG', hostelType: 'BOYS', outlookEmail: 'test7@outlook.com' },
    { email: 'test8@iitg.ac.in', name: 'Test Persona 8', rollNumber: '26010008', hostelName: 'GAURANG_HOSTEL', hostelCode: 'GRG', hostelType: 'BOYS', outlookEmail: 'test8@outlook.com' },
    { email: 'test9@iitg.ac.in', name: 'Test Persona 9', rollNumber: '26010009', hostelName: 'BARAK_HOSTEL', hostelCode: 'BRK', hostelType: 'BOYS', outlookEmail: 'test9@outlook.com' },
    { email: 'test10@iitg.ac.in', name: 'Test Persona 10', rollNumber: '26010010', hostelName: 'BRAHMAPUTRA_HOSTEL', hostelCode: 'BHP', hostelType: 'BOYS', outlookEmail: 'test10@outlook.com' },
    // { email: 's.vala@iitg.ac.in', name: 'Vala Manan', rollNumber: '26010011', hostelName: 'LOHIT_HOSTEL', hostelCode: 'LHT', hostelType: 'BOYS', outlookEmail: 's.vala@outlook.com' },
  ] as const;

  // Clean up old test data first (both @outlook.com and @iitg.ac.in)
  const allTestEmails = [
    ...personas.map(p => p.email),
    ...Array.from({ length: 10 }, (_, i) => `test${i + 1}@outlook.com`)
  ];
  
  await prisma.user.deleteMany({
    where: {
      email: { in: allTestEmails }
    }
  });

  for (const p of personas) {
    let hostel = await prisma.hostel.findFirst({
      where: { academicYearId: academicYear.id, code: p.hostelCode }
    });

    if (!hostel) {
      hostel = await prisma.hostel.create({
        data: {
          academicYearId: academicYear.id,
          name: p.hostelName as any,
          code: p.hostelCode,
          type: p.hostelType as any,
          isActive: true
        }
      });
      console.log(`Created Hostel: ${p.hostelCode}`);
    }

    // Upsert User — keyed on email since that is now the login identifier
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        passwordHash: hashedPassword,
        mustChangePassword: ['test1@iitg.ac.in'].includes(p.email), // ['test1@iitg.ac.in', 's.vala@iitg.ac.in'].includes(p.email)
        isActive: true,
        role: 'STUDENT',
      },
      create: {
        loginId: p.email, // loginId mirrors email for backwards-compat with the unique constraint
        email: p.email,
        passwordHash: hashedPassword,
        mustChangePassword: ['test1@iitg.ac.in'].includes(p.email), // ['test1@iitg.ac.in', 's.vala@iitg.ac.in'].includes(p.email)
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
        outlookEmail: p.outlookEmail,
        academicYearId: academicYear.id,
        hostelId: hostel.id,
      },
      create: {
        userId: user.id,
        name: p.name,
        rollNumber: p.rollNumber,
        branch: 'Computer Science and Engineering',
        email: p.email,
        outlookEmail: p.outlookEmail,
        academicYearId: academicYear.id,
        hostelId: hostel.id,
      },
    });

    console.log(`Upserted Persona: ${p.email} at ${p.hostelCode}`);
  }

  console.log('\nSeed completed successfully.');
  console.log('You can log in using:');
  console.log('Emails: test1@iitg.ac.in through test10@iitg.ac.in');
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
