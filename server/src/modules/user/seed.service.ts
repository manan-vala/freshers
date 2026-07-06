import { prisma } from '@/config/prisma';
import { hashPassword } from '@/utils/password.util';

export async function seedPersonas(academicYearStr: string) {
  // Validate academic year format
  if (!/^\d{4}-\d{4}$/.test(academicYearStr)) {
    throw new Error('Invalid academic year format. Must be YYYY-YYYY (e.g. 2026-2027).');
  }

  // Ensure we have the specified academic year
  let academicYear = await prisma.academicYear.findFirst({
    where: { year: academicYearStr },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        year: academicYearStr,
        isActive: true,
      },
    });
  }

  const defaultPassword = 'Swc_password';
  const hashedPassword = await hashPassword(defaultPassword);

  const personas = [
    { email: 'test1@iitg.ac.in', name: 'Test Persona 1', rollNumber: '26010001', hostelName: 'LOHIT_HOSTEL', hostelCode: 'LHT', hostelType: 'BOYS', personalEmail: 'test1@gmail.com' },
    { email: 'test2@iitg.ac.in', name: 'Test Persona 2', rollNumber: '26010002', hostelName: 'DISANG_HOSTEL', hostelCode: 'DSG', hostelType: 'BOYS', personalEmail: 'test2@gmail.com' },
    { email: 'test3@iitg.ac.in', name: 'Test Persona 3', rollNumber: '26010003', hostelName: 'SUBANSIRI_HOSTEL', hostelCode: 'SBN', hostelType: 'GIRLS', personalEmail: 'test3@gmail.com' },
    { email: 'test4@iitg.ac.in', name: 'Test Persona 4', rollNumber: '26010004', hostelName: 'UMIAM_HOSTEL', hostelCode: 'UMM', hostelType: 'BOYS', personalEmail: 'test4@gmail.com' },
    { email: 'test5@iitg.ac.in', name: 'Test Persona 5', rollNumber: '26010005', hostelName: 'DHANSIRI_HOSTEL', hostelCode: 'DHS', hostelType: 'GIRLS', personalEmail: 'test5@gmail.com' },
    { email: 'test6@iitg.ac.in', name: 'Test Persona 6', rollNumber: '26010006', hostelName: 'MANAS_HOSTEL', hostelCode: 'MNS', hostelType: 'BOYS', personalEmail: 'test6@gmail.com' },
    { email: 'test7@iitg.ac.in', name: 'Test Persona 7', rollNumber: '26010007', hostelName: 'KAMENG_HOSTEL', hostelCode: 'KMG', hostelType: 'BOYS', personalEmail: 'test7@gmail.com' },
    { email: 'test8@iitg.ac.in', name: 'Test Persona 8', rollNumber: '26010008', hostelName: 'GAURANG_HOSTEL', hostelCode: 'GRG', hostelType: 'BOYS', personalEmail: 'test8@gmail.com' },
    { email: 'test9@iitg.ac.in', name: 'Test Persona 9', rollNumber: '26010009', hostelName: 'BARAK_HOSTEL', hostelCode: 'BRK', hostelType: 'BOYS', personalEmail: 'test9@gmail.com' },
    { email: 'test10@iitg.ac.in', name: 'Test Persona 10', rollNumber: '26010010', hostelName: 'BRAHMAPUTRA_HOSTEL', hostelCode: 'BHP', hostelType: 'BOYS', personalEmail: 'test10@gmail.com' },
  ] as const;

  // Clean up old test data first
  const allTestEmails = [
    ...personas.map(p => p.email),
    ...Array.from({ length: 10 }, (_, i) => `test${i + 1}@outlook.com`)
  ];
  
  const usersToDelete = await prisma.user.findMany({
    where: { email: { in: allTestEmails } },
    select: { id: true }
  });
  
  const userIds = usersToDelete.map((u) => u.id);
  
  if (userIds.length > 0) {
    // Delete dependent records to avoid foreign key constraints
    await prisma.allocationAudit.deleteMany({
      where: {
        OR: [
          { allocation: { student: { userId: { in: userIds } } } },
          { performedBy: { in: userIds } }
        ]
      }
    });
    
    await prisma.allocation.deleteMany({
      where: {
        OR: [
          { student: { userId: { in: userIds } } },
          { allocatedBy: { in: userIds } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }

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
    }

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        passwordHash: hashedPassword,
        mustChangePassword: ['test1@iitg.ac.in'].includes(p.email),
        isActive: true,
        role: 'STUDENT',
      },
      create: {
        loginId: p.email,
        email: p.email,
        passwordHash: hashedPassword,
        mustChangePassword: ['test1@iitg.ac.in'].includes(p.email),
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
        discipline: 'Computer Science and Engineering',
        programme: 'Bachelor of Technology (B.Tech)',
        outlookId: p.email,
        gmailId: p.personalEmail,
        academicYearId: academicYear.id,
        hostelId: hostel.id,
      },
      create: {
        userId: user.id,
        name: p.name,
        rollNumber: p.rollNumber,
        discipline: 'Computer Science and Engineering',
        programme: 'Bachelor of Technology (B.Tech)',
        outlookId: p.email,
        gmailId: p.personalEmail,
        academicYearId: academicYear.id,
        hostelId: hostel.id,
      },
    });
  }

  return {
    academicYear: academicYearStr,
    personsSeeded: personas.length,
  };
}
