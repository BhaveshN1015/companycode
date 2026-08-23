import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import authRoutes from './src/routes/auth';
import kisanCardRoutes from './src/routes/kisanCard';

process.env.JWT_SECRET = 'test-secret-phase2';
process.env.NODE_ENV = 'test';

const CARD_REGEX = /^AGK-[BCDFGHJKLMNPQRSTVWXYZ][AEIOU][BCDFGHJKLMNPQRSTVWXYZ][AEIOU]-[BCDFGHJKLMNPQRSTVWXYZ][AEIOU][BCDFGHJKLMNPRSTVWXYZ][AEIOU][BCDFGHJKLMNPQRSTVWXYZ][AEIOU]$/;

const onboarding = {
  fullName: 'Sunita Devi', fatherName: 'Ram Devi', gender: 'Female', dateOfBirth: '1980-01-01',
  location: { state: 'Uttar Pradesh', district: 'Agra', tehsil: 'Agra', village: 'Malipura', pincode: '282001' },
  agriculture: { totalLandArea: 3, landUnit: 'acres', farmingCategory: 'Crop Farming', mainCrops: ['Wheat', 'Mustard'], annualIncomeRange: '₹2,00,000 - ₹4,00,000' },
};

async function registerFarmer(a: any, email: string) {
  const otp = await request(a).post('/api/auth/register/request-otp').send({ email });
  await request(a).post('/api/auth/register/verify-otp').send({ email, otp: otp.body.devOtp });
  const r = await request(a).post('/api/auth/register').send({ name: 'Sunita Devi', email, password: 'pass1234', role: 'farmer', authProvider: 'local' });
  return r.body.token;
}

let pass = 0, fail = 0;
function assert(n: string, c: any, extra = '') {
  if (c) { pass++; console.log('  PASS:', n); } else { fail++; console.log('  FAIL:', n, extra); }
}

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/kisan-card', kisanCardRoutes);

  console.log('# Dashboard data contract (Phase 2)');

  // Farmer WITHOUT a card first
  const tokenNoCard = await registerFarmer(app, 'nocard@test.local');
  const s1 = await request(app).get('/api/kisan-card/status').set('Authorization', `Bearer ${tokenNoCard}`);
  assert('card-less farmer status hasCard=false', s1.body.data.hasCard === false, JSON.stringify(s1.body));
  const g1 = await request(app).get('/api/kisan-card').set('Authorization', `Bearer ${tokenNoCard}`);
  assert('card-less farmer GET /api/kisan-card -> 404', g1.status === 404, `status=${g1.status}`);

  // Farmer WITH a card (the fields the dashboard renders)
  const token = await registerFarmer(app, 'withcard@test.local');
  const create = await request(app).post('/api/kisan-card').set('Authorization', `Bearer ${token}`).send(onboarding);
  assert('create card 201', create.status === 201, `status=${create.status}`);
  const cardNumber = create.body.data.cardNumber;
  assert('card number format (dash form)', /^AGK-[A-Z]{4}-[A-Z]{4}$/.test(cardNumber), `got ${cardNumber}`);

  // What the DashboardKisanCard component fetches:
  const status = await request(app).get('/api/kisan-card/status').set('Authorization', `Bearer ${token}`);
  assert('dashboard GET /status 200 hasCard true', status.status === 200 && status.body.data.hasCard === true);
  assert('status.cardNumber matches', status.body.data.cardNumber === cardNumber);

  const card = await request(app).get('/api/kisan-card').set('Authorization', `Bearer ${token}`);
  assert('dashboard GET / 200', card.status === 200, `status=${card.status}`);
  const d = card.body.data;
  assert('card.fullName', d.fullName === 'Sunita Devi');
  assert('card.location.state', d.location.state === 'Uttar Pradesh');
  assert('card.location.district', d.location.district === 'Agra');
  assert('card.location.village', d.location.village === 'Malipura');
  assert('card.agriculture.totalLandArea', d.agriculture.totalLandArea === 3);
  assert('card.agriculture.landUnit', d.agriculture.landUnit === 'acres');
  assert('card.agriculture.mainCrops', JSON.stringify(d.agriculture.mainCrops) === JSON.stringify(['Wheat', 'Mustard']));
  assert('card.agriculture.annualIncomeRange', d.agriculture.annualIncomeRange === '₹2,00,000 - ₹4,00,000');
  assert('no sensitive fields exposed', d.aadhaar === undefined && d.bankAccount === undefined && d.password === undefined && d.pan === undefined);

  // Copy-card-number path uses the same cardNumber value
  assert('cardNumber copyable (non-empty, matches format)', typeof cardNumber === 'string' && cardNumber.length === 13 && /^AGK-[A-Z]{4}-[A-Z]{4}$/.test(cardNumber));

  await mongoose.disconnect();
  await mongod.stop();
  console.log(`\n==== Phase 2 RESULTS: ${pass} passed, ${fail} failed ====`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
