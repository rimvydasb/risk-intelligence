/**
 * Seed development database with example data from docs/examples/.
 * Run with: npx ts-node scripts/seed-dev.ts
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new PrismaClient();

async function main() {
  const examplesDir = path.join(__dirname, '..', 'docs', 'examples');

  // ── Seed StagingAsmuo ─────────────────────────────────────────────────
  const asmuoDir = path.join(examplesDir, 'asmuo');
  const asmuoFiles = fs.readdirSync(asmuoDir).filter((f) => f.endsWith('.json'));

  for (const file of asmuoFiles) {
    const jarKodas = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(asmuoDir, file), 'utf-8'));
    await db.stagingAsmuo.upsert({
      where: { jarKodas },
      create: { jarKodas, data },
      update: { data, fetchedAt: new Date() },
    });
    console.log(`  ✓ StagingAsmuo: ${jarKodas}`);
  }

  // ── Seed StagingSutartis ──────────────────────────────────────────────
  const sutartisDir = path.join(examplesDir, 'sutartis');
  const sutartisFiles = fs.readdirSync(sutartisDir).filter((f) => f.endsWith('.json'));

  for (const file of sutartisFiles) {
    const sutartiesUnikalusID = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(sutartisDir, file), 'utf-8'));
    await db.stagingSutartis.upsert({
      where: { sutartiesUnikalusID },
      create: { sutartiesUnikalusID, data },
      update: { data, fetchedAt: new Date() },
    });
    console.log(`  ✓ StagingSutartis: ${sutartiesUnikalusID}`);
  }

  // ── Seed StagingPirkimas ──────────────────────────────────────────────
  const pirkimasDir = path.join(examplesDir, 'viesiejiPirkimai');
  const pirkimasFiles = fs.readdirSync(pirkimasDir).filter((f) => f.endsWith('.json'));

  for (const file of pirkimasFiles) {
    const pirkimoId = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(pirkimasDir, file), 'utf-8'));
    await db.stagingPirkimas.upsert({
      where: { pirkimoId },
      create: { pirkimoId, data },
      update: { data, fetchedAt: new Date() },
    });
    console.log(`  ✓ StagingPirkimas: ${pirkimoId}`);
  }

  console.log('\nDone! Database seeded with example data.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
