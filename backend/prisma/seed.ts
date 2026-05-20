import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('No seed data configured yet.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
