import 'dotenv/config';
import { prisma } from '../config/prisma';

async function main() {
  await prisma.user.update({
    where: { email: 'test@iitg.ac.in' }, // Make sure this matches the email you created
    data: { 
      mustChangePassword: true 
    },
  });
  
  console.log('✓ User successfully reset for First-Login testing!');
}

main().catch(console.error);