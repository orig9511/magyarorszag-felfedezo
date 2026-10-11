import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EventImportService, EventImportFormat } from '../modules/event/event-import.service';

function parseArg(name: string): string | undefined {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function run(): Promise<void> {
  const filePath = parseArg('file');
  const format = (parseArg('format') || 'json') as EventImportFormat;
  const source = parseArg('source') || 'manual_file';

  if (!filePath || !['json', 'csv'].includes(format)) {
    console.error('Usage: npm run import:events -- --file=<path> --format=json|csv --source=<source> [--dry-run] [--allow-test-data]');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const service = app.get(EventImportService);
    const result = await service.importFromFile({
      filePath,
      format,
      source,
      dryRun: hasFlag('dry-run'),
      allowTestData: hasFlag('allow-test-data'),
    });

    console.log('\nEvent import summary');
    console.log(`source: ${result.source}`);
    console.log(`processed: ${result.processed}`);
    console.log(`created: ${result.created}`);
    console.log(`updated: ${result.updated}`);
    console.log(`skipped: ${result.skipped}`);
    console.log(`failed: ${result.failed}`);
    console.log(`durationMs: ${result.durationMs}`);
    if (result.errors.length > 0) {
      console.log('errors:');
      for (const error of result.errors.slice(0, 50)) {
        console.log(`  - ${error}`);
      }
    }
  } finally {
    await app.close();
  }
}

void run();
