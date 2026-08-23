import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import authRoutes from './src/routes/auth';
import kisanCardRoutes from './src/routes/kisanCard';
import schemeRoutes from './src/routes/schemes';
import adminRoutes from './src/routes/admin';
import { User } from './src/models/User';
import { AgroudAnKisanCard } from './src/models/AgroudAnKisanCard';
import { GovtScheme } from './src/models/GovtScheme';

process.env.JWT_SECRET = 'test-secret-phase6';
process.env.NODE_ENV = 'test';

const onboarding = {
    fullName: 'Sunita Devi',
    fatherName: 'Ram Devi',
    gender: 'Female',
    dateOfBirth: '1985-03-15',
    location: { state: 'Uttar Pradesh', district: 'Agra', tehsil: 'Agra', village: 'Malipura', pincode: '282001' },
    agriculture: {
        totalLandArea: 3,
        landUnit: 'acres',
        farmingCategory: 'Crop Farming',
        mainCrops: ['Wheat', 'Mustard'],
        annualIncomeRange: '₹2,00,000 - ₹4,00,000',
    },
};

const slug = (t: string) => t.toLowerCase().replace(/\s+/g, '-');

async function registerFarmer(app: any, email: string) {
    await request(app).post('/api/auth/register/request-otp').send({ email });
    const otp = (await request(app).post('/api/auth/register/request-otp').send({ email })).body.devOtp;
    await request(app).post('/api/auth/register/verify-otp').send({ email, otp });
    const r = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Sunita Devi', email, password: 'pass1234', role: 'farmer', authProvider: 'local' });
    return r.body.token as string;
}

async function loginAdmin(app: any) {
    await User.create({
        name: 'Admin One',
        email: 'admin6@test.local',
        password: await bcrypt.hash('adminpass', 10),
        role: 'admin' as any,
        verified: true,
        isActive: true,
        farmSize: 0,
    });
    const r = await request(app).post('/api/auth/login').send({ email: 'admin6@test.local', password: 'adminpass' });
    return r.body.token as string;
}

let pass = 0,
    fail = 0;
function assert(name: string, cond: any, extra = '') {
    if (cond) {
        pass++;
        console.log('  PASS:', name);
    } else {
        fail++;
        console.log('  FAIL:', name, extra);
    }
}

(async () => {
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/kisan-card', kisanCardRoutes);
    app.use('/api/schemes', schemeRoutes);
    app.use('/api/admin', adminRoutes);

    // ── Fixtures: a handful of real-shape GovtScheme docs with eligibilityRules ──
    const schemes = [
        { title: 'Income OK Central', slug: slug('Income OK Central'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published', eligibilityRules: { maxIncome: 500000 } } as any,
        { title: 'Income Too High', slug: slug('Income Too High'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published', eligibilityRules: { maxIncome: 300000 } } as any,
        { title: 'Land Limited', slug: slug('Land Limited'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published', eligibilityRules: { maxLandHectares: 1 } } as any,
        { title: 'UP Suitable', slug: slug('UP Suitable'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'state', state: 'Uttar Pradesh', status: 'published', eligibilityRules: { maxIncome: 500000, maxLandHectares: 5 } } as any,
        { title: 'Maharashtra Only', slug: slug('Maharashtra Only'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'state', state: 'Maharashtra', status: 'published' } as any,
        { title: 'SC Category Only', slug: slug('SC Category Only'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published', eligibilityRules: { categories: ['sc'] } } as any,
        { title: 'Open Central', slug: slug('Open Central'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published' } as any,
        { title: 'Age Bound', slug: slug('Age Bound'), summary: 's', description: 'd', department: 'DBT', audience: 'farmers', schemeType: 'central', status: 'published', eligibilityRules: { minAge: 18, maxAge: 60 } } as any,
    ];
    const created = (await GovtScheme.create(schemes)) as any[];
    const idOf = (title: string) => String(created.find((s) => s.title === title)!._id);

    // ── Farmer registers + creates a Kisan Card ──
    const ftoken = await registerFarmer(app, 'farmer6@test.local');
    const create = await request(app).post('/api/kisan-card').set('Authorization', `Bearer ${ftoken}`).send(onboarding);
    assert('create card 201', create.status === 201, `status=${create.status}`);
    const cardNumber = create.body.data.cardNumber as string;
    assert('card number format', /^AGK-[A-Z]{4}-[A-Z]{4}$/.test(cardNumber), `got ${cardNumber}`);
    assert('duplicate card prevented', (await request(app).post('/api/kisan-card').set('Authorization', `Bearer ${ftoken}`).send(onboarding)).status === 200);

    // ── Phase 4: /schemes still loads (existing) ──
    const list = await request(app).get('/api/schemes');
    assert('/schemes loads 200', list.status === 200, `status=${list.status}`);
    assert('existing schemes still appear', list.body.data.length >= schemes.length, `len=${list.body.data.length}`);

    const central = await request(app).get('/api/schemes?schemeType=central');
    assert('central schemes appear', central.body.data.some((s: any) => s.schemeType === 'central'));

    const stateOnly = await request(app).get('/api/schemes?schemeType=state&state=Uttar%20Pradesh');
    assert('state schemes filter works', stateOnly.body.data.every((s: any) => s.schemeType === 'state'));

    // ── Phase 4: personalized eligibility ──
    const elig = await request(app).get('/api/schemes/my-eligibility').set('Authorization', `Bearer ${ftoken}`);
    assert('/my-eligibility 200', elig.status === 200, `status=${elig.status}`);
    assert('hasCard true', elig.body.hasCard === true);
    assert('cardSummary.cardNumber matches', elig.body.cardSummary.cardNumber === cardNumber);
    assert('cardSummary.state', elig.body.cardSummary.state === 'Uttar Pradesh');
    const map = elig.body.eligibility as Record<string, any>;

    const incOk = map[idOf('Income OK Central')];
    const incHigh = map[idOf('Income Too High')];
    const landLim = map[idOf('Land Limited')];
    const upSuit = map[idOf('UP Suitable')];
    const mhOnly = map[idOf('Maharashtra Only')];
    const scOnly = map[idOf('SC Category Only')];
    const openCentral = map[idOf('Open Central')];
    const ageBound = map[idOf('Age Bound')];

    assert('income-eligible scheme -> eligible', incOk?.status === 'eligible', JSON.stringify(incOk));
    assert('income-too-high -> not-eligible', incHigh?.status === 'not-eligible', JSON.stringify(incHigh));
    assert('income reason reveals NO raw value', incHigh && !/\d/.test(incHigh.reasons.join(' ')), JSON.stringify(incHigh));
    assert('land-limited -> not-eligible (3 acres>1ha)', landLim?.status === 'not-eligible', JSON.stringify(landLim));
    assert('UP state scheme -> eligible', upSuit?.status === 'eligible', JSON.stringify(upSuit));
    assert('Maharashtra-only -> not-eligible (location)', mhOnly?.status === 'not-eligible', JSON.stringify(mhOnly));
    assert('SC-category -> information-required (no social category on card)', scOnly?.status === 'information-required', JSON.stringify(scOnly));
    assert('open central -> unknown', openCentral?.status === 'unknown', JSON.stringify(openCentral));
    assert('age-bound (46) -> eligible', ageBound?.status === 'eligible', JSON.stringify(ageBound));

    // ── Phase 4: card update propagates to eligibility (no stale cached copy) ──
    await request(app)
        .put('/api/kisan-card')
        .set('Authorization', `Bearer ${ftoken}`)
        .send({ ...onboarding, agriculture: { ...onboarding.agriculture, annualIncomeRange: '5-10 लाख' } });
    const elig2 = await request(app).get('/api/schemes/my-eligibility').set('Authorization', `Bearer ${ftoken}`);
    const map2 = elig2.body.eligibility as Record<string, any>;
    const incOk2 = map2[idOf('Income OK Central')];
    assert('after income update, previously-eligible scheme -> not-eligible', incOk2?.status === 'not-eligible', JSON.stringify(incOk2));

    // ── Non-farmer gets no card eligibility ──
    const adminToken = await loginAdmin(app);
    const adminElig = await request(app).get('/api/schemes/my-eligibility').set('Authorization', `Bearer ${adminToken}`);
    assert('non-farmer -> hasCard false', adminElig.body.hasCard === false);
    // Unauthenticated -> 401
    const noAuth = await request(app).get('/api/schemes/my-eligibility');
    assert('unauthenticated /my-eligibility -> 401', noAuth.status === 401, `status=${noAuth.status}`);

    // ── Phase 5: admin Kisan Cards ──
    const overview = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${adminToken}`);
    assert('overview returns 200', overview.status === 200, `status=${overview.status}`);
    assert('overview totals.kisanCards count', overview.body.data.totals.kisanCards === 1, JSON.stringify(overview.body.data.totals));
    assert('overview totals.users still present', typeof overview.body.data.totals.users === 'number');

    const cardsList = await request(app).get('/api/admin/kisan-cards').set('Authorization', `Bearer ${adminToken}`);
    assert('/admin/kisan-cards 200', cardsList.status === 200, `status=${cardsList.status}`);
    assert('admin card list non-empty', (cardsList.body.data as any[]).length >= 1);
    const adminCard = cardsList.body.data[0] as any;
    assert('admin card exposes cardNumber', !!adminCard.cardNumber);
    assert('admin card exposes fullName', adminCard.fullName === 'Sunita Devi');
    assert('admin card exposes state/district/tehsil/village', adminCard.location?.state === 'Uttar Pradesh' && adminCard.location?.village === 'Malipura');
    assert('admin card exposes land + mainCrops', typeof adminCard.agriculture?.totalLandArea === 'number' && Array.isArray(adminCard.agriculture?.mainCrops));
    assert('admin card exposes cardStatus', typeof adminCard.cardStatus === 'string');
    assert('admin card exposes registration date', !!adminCard.createdAt);
    assert('admin card hides sensitive fields',
        adminCard.aadhaar === undefined && adminCard.bankAccount === undefined && adminCard.password === undefined && adminCard.pan === undefined && adminCard.pinHash === undefined,
        JSON.stringify(Object.keys(adminCard)));

    // Search
    const sCard = await request(app).get('/api/admin/kisan-cards?search=' + encodeURIComponent(cardNumber)).set('Authorization', `Bearer ${adminToken}`);
    assert('admin search by card number', (sCard.body.data as any[]).some((c: any) => c.cardNumber === cardNumber));
    const sName = await request(app).get('/api/admin/kisan-cards?search=Sunita').set('Authorization', `Bearer ${adminToken}`);
    assert('admin search by farmer name', (sName.body.data as any[]).some((c: any) => c.fullName === 'Sunita Devi'));
    const sState = await request(app).get('/api/admin/kisan-cards?state=Uttar').set('Authorization', `Bearer ${adminToken}`);
    assert('admin filter by state', (sState.body.data as any[]).some((c: any) => /uttar pradesh/i.test(c.location?.state || '')));

    // Non-admin (farmer) denied; unauthenticated denied
    const farmerDenied = await request(app).get('/api/admin/kisan-cards').set('Authorization', `Bearer ${ftoken}`);
    assert('farmer denied /admin/kisan-cards (403)', farmerDenied.status === 403, `status=${farmerDenied.status}`);
    const noAuthAdmin = await request(app).get('/api/admin/kisan-cards');
    assert('unauthenticated /admin/kisan-cards -> 401', noAuthAdmin.status === 401, `status=${noAuthAdmin.status}`);

    await mongoose.disconnect();
    await mongod.stop();
    console.log(`\n==== Phase 6 RESULTS: ${pass} passed, ${fail} failed ====`);
    process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
