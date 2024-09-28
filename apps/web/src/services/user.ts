import { prisma } from '@grantoz/db';
import { User } from '@prisma/client';

export async function getAllUsers() {
  const users: User[] = await prisma.user.findMany();
  return users;
}