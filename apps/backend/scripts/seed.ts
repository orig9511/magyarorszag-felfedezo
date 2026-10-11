import { DataSource } from 'typeorm';
import { County } from '../src/modules/county/county.entity';
import { Settlement } from '../src/modules/settlement/settlement.entity';

/**
 * Seed database with Lechner INSPIRE counties and settlements.
 * Run after migrations: npx ts-node scripts/seed.ts
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/momap',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected.');

    const countyRepo = dataSource.getRepository(County);
    const settlementRepo = dataSource.getRepository(Settlement);

    // Define counties (CC BY 4.0 Lechner INSPIRE)
    // Simplified geometries for MVP; production uses official WFS service
    const countyGeometries = [
      {
        id: '12345678-1111-1111-1111-111111111111',
        name: 'Hajdú-Bihar',
        nameEn: 'Hajdu-Bihar',
        code: 'HU-HB',
        // Approx Debrecen region: lon 21.5-21.8, lat 47.4-47.7
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[21.5, 47.4], [21.5, 47.7], [21.8, 47.7], [21.8, 47.4], [21.5, 47.4]]]],
        },
      },
      {
        id: '87654321-1111-1111-1111-111111111111',
        name: 'Budapest',
        nameEn: 'Budapest',
        code: 'HU-BP',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[19.0, 47.3], [19.0, 47.6], [19.3, 47.6], [19.3, 47.3], [19.0, 47.3]]]],
        },
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Borsod-Abaúj-Zemplén',
        nameEn: 'Borsod-Abauj-Zemplen',
        code: 'HU-BZ',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[20.8, 48.0], [20.8, 48.5], [21.8, 48.5], [21.8, 48.0], [20.8, 48.0]]]],
        },
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Szabolcs-Szatmár-Bereg',
        nameEn: 'Szabolcs-Szatmar-Bereg',
        code: 'HU-SS',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[21.8, 47.7], [21.8, 48.5], [22.8, 48.5], [22.8, 47.7], [21.8, 47.7]]]],
        },
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Pest',
        nameEn: 'Pest',
        code: 'HU-PE',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[18.5, 47.1], [18.5, 47.8], [20.0, 47.8], [20.0, 47.1], [18.5, 47.1]]]],
        },
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Jász-Nagykun-Szolnok',
        nameEn: 'Jasz-Nagykun-Szolnok',
        code: 'HU-JN',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[20.5, 46.8], [20.5, 47.4], [21.5, 47.4], [21.5, 46.8], [20.5, 46.8]]]],
        },
      },
    ];

    // Seed counties
    console.log('Seeding counties...');
    for (const countyData of countyGeometries) {
      const existing = await countyRepo.findOne({ where: { code: countyData.code } });
      if (!existing) {
        const county = countyRepo.create({
          ...countyData,
          active: true,
        });
        await countyRepo.save(county);
        console.log(`  ✓ ${countyData.name}`);
      } else {
        console.log(`  - ${countyData.name} (already exists)`);
      }
    }

    // Seed settlements
    console.log('Seeding settlements...');
    const settlements = [
      { name: 'Debrecen', nameEn: 'Debrecen', countyCode: 'HU-HB', type: 'city', lat: 47.53, lon: 21.63 },
      { name: 'Hajdúszoboszló', nameEn: 'Hajdúszoboszló', countyCode: 'HU-HB', type: 'town', lat: 47.46, lon: 21.5 },
      { name: 'Hajdúböszörmény', nameEn: 'Hajdúböszörmény', countyCode: 'HU-HB', type: 'town', lat: 47.45, lon: 21.45 },
      { name: 'Balmazújváros', nameEn: 'Balmazújváros', countyCode: 'HU-HB', type: 'town', lat: 47.58, lon: 21.54 },
      { name: 'Hortobagy', nameEn: 'Hortobagy', countyCode: 'HU-HB', type: 'village', lat: 47.54, lon: 21.0 },
      { name: 'Budapest', nameEn: 'Budapest', countyCode: 'HU-BP', type: 'capital', lat: 47.497, lon: 19.04 },
    ];

    for (const settlementData of settlements) {
      const county = await countyRepo.findOne({ where: { code: settlementData.countyCode } });
      if (!county) {
        console.log(`  ! County not found: ${settlementData.countyCode}`);
        continue;
      }

      const existing = await settlementRepo.findOne({
        where: { name: settlementData.name, countyId: county.id },
      });

      if (!existing) {
        const settlement = settlementRepo.create({
          name: settlementData.name,
          nameEn: settlementData.nameEn,
          countyId: county.id,
          settlementType: settlementData.type,
          latitude: settlementData.lat,
          longitude: settlementData.lon,
        });
        await settlementRepo.save(settlement);
        console.log(`  ✓ ${settlementData.name} (${settlementData.countyCode})`);
      } else {
        console.log(`  - ${settlementData.name} (already exists)`);
      }
    }

    console.log('\n✅ Seed completed.');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
