import { config } from 'dotenv';
config({ path: './.env' });
import { prisma } from './src/config/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, email: u.email, loginId: u.loginId, deletedAt: u.deletedAt })));
}
main().finally(() => prisma.$disconnect());
