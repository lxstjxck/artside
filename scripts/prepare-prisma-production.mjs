import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const targetPath = path.join(process.cwd(), 'prisma', 'schema.production.prisma');

const source = await readFile(sourcePath, 'utf8');
const productionSchema = source.replace(
  'provider = "sqlite"',
  'provider = "postgresql"'
);

if (productionSchema === source) {
  throw new Error('Could not switch Prisma provider from sqlite to postgresql.');
}

await writeFile(targetPath, productionSchema, 'utf8');
console.log(`Prepared ${path.relative(process.cwd(), targetPath)} for PostgreSQL.`);
