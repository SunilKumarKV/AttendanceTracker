import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

async function main() {
  const institutionName = required('FIRST_ADMIN_INSTITUTION_NAME');
  const institutionCode = required('FIRST_ADMIN_INSTITUTION_CODE');
  const email = required('FIRST_ADMIN_EMAIL').toLowerCase();
  const password = required('FIRST_ADMIN_PASSWORD');
  const name = process.env.FIRST_ADMIN_NAME?.trim() || 'First Admin';

  if (password.length < 12) {
    throw new Error('FIRST_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const institution = await prisma.institution.upsert({
    where: { code: institutionCode },
    update: { name: institutionName },
    create: {
      name: institutionName,
      code: institutionCode,
      email,
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      institutionId: institution.id,
      name,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.appSettings.upsert({
    where: { institutionId: institution.id },
    update: {},
    create: { institutionId: institution.id },
  });

  console.log(`First admin ready for ${institutionName}: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
