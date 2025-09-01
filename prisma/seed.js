import { STATUS_DATA, JOB_SOURCES } from "../src/lib/data/seedData.js";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedStatus() {
  try {
    const statuses = STATUS_DATA;
    for (const status of statuses) {
      // Check if the status already exists
      const existingStatus = await prisma.jobStatus.findUnique({
        where: {
          value: status.value,
        },
      });

      // If the status does not exist, create it
      if (!existingStatus) {
        await prisma.jobStatus.create({
          data: status,
        });
      }
    }
    console.log("Seeded statuses");
  } catch (error) {
    console.error("Error seeding status: ", error);
    throw error;
  }
}

async function seedJobSources() {
  try {
    const sources = JOB_SOURCES;
    for (const source of sources) {
      const { label, value } = source;
      await prisma.jobSource.upsert({
        where: {
          value,
        },
        update: { label, value },
        create: { label, value },
      });
    }
    console.log("Seeded job sources");
  } catch (error) {
    console.error("Error seeding job sources: ", error);
    throw error;
  }
}

async function main() {
  await seedStatus();
  await seedJobSources();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
