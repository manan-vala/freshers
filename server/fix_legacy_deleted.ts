import { config } from 'dotenv';
config({ path: './.env' });
import { prisma } from './src/config/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null } }
  });
  
  for (const user of users) {
    if (!user.email.includes('_deleted_')) {
      const timestamp = user.deletedAt?.getTime() || Date.now();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: `${user.email}_deleted_${timestamp}`,
          loginId: `${user.loginId}_deleted_${timestamp}`
        }
      });
      console.log(`Updated legacy deleted user: ${user.email}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
