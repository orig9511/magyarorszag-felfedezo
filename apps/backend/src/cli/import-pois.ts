import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OSMAdapter } from '../modules/ingestion/adapters/osm.adapter';
import { WikidataAdapter } from '../modules/ingestion/adapters/wikidata.adapter';
import { IngestionService } from '../modules/ingestion/ingestion.service';

function parseArg(name: string): string | undefined {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
}

async function run(): Promise<void> {
  const source = parseArg('source') || 'osm';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const ingestion = app.get(IngestionService);
    let adapter;
    if (source === 'osm') {
      adapter = app.get(OSMAdapter);
    } else if (source === 'wikidata') {
      adapter = app.get(WikidataAdapter);
    } else {
      console.error('Usage: npm run import:pois -- --source=osm|wikidata');
      process.exit(1);
    }
    const result = await ingestion.ingestData(adapter);
    console.log('\nPOI import summary');
    console.log(`source: ${result.source}`);
    console.log(`itemsProcessed: ${result.itemsProcessed}`);
    console.log(`itemsCreated: ${result.itemsCreated}`);
    console.log(`itemsUpdated: ${result.itemsUpdated}`);
    console.log(`itemsSkipped: ${result.itemsSkipped}`);
    console.log(`itemsFailed: ${result.itemsFailed}`);
    console.log(`durationMs: ${result.completedAt.getTime() - result.startedAt.getTime()}`);
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
