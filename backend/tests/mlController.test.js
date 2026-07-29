require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const mlController = require('../controllers/mlController');
const alertController = require('../controllers/alertController');
const incidentController = require('../controllers/incidentController');

const testMongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sentinelai-test';

const makeMockRes = () => {
  return {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
};

async function runTests() {
  console.log('🧪 Starting ML Controller & Auto-Generation Removal Tests...');
  
  try {
    await mongoose.connect(testMongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB for testing');

    // Clean up collections
    await Alert.deleteMany({ ruleName: { $regex: '^TEST_ML_' } });
    await Incident.deleteMany({ title: { $regex: '^Incident Report: TEST_ML_' } });

    // Ensure MLThreatData collection is dropped or empty
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    if (collectionNames.includes('mlthreatdatas')) {
      await mongoose.connection.db.collection('mlthreatdatas').deleteMany({});
    }

    // --- 1. Test ML Controller Health ---
    console.log('\n--- 1. Testing ML Health Endpoint ---');
    const healthReq = { user: { username: 'test_user' } };
    const healthRes = makeMockRes();
    await mlController.getHealth(healthReq, healthRes);
    
    assert.strictEqual(healthRes.statusCode, 200);
    assert.strictEqual(healthRes.jsonData.success, true);
    assert.ok(healthRes.jsonData.data);
    console.log('✅ Health check endpoint passed!');

    // --- 2. Test Anomaly Detection Endpoint ---
    console.log('\n--- 2. Testing ML Anomaly Detection Endpoint ---');
    const analyzeReq = {
      body: {
        logs: [
          { duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF' }
        ]
      }
    };
    const analyzeRes = makeMockRes();
    await mlController.analyzeAnomaly(analyzeReq, analyzeRes);
    
    assert.strictEqual(analyzeRes.statusCode, 200);
    assert.strictEqual(analyzeRes.jsonData.success, true);
    assert.ok(Array.isArray(analyzeRes.jsonData.data.results));
    console.log('✅ Anomaly detection endpoint passed!');

    // --- 3. Test Threat Classification Endpoint ---
    console.log('\n--- 3. Testing ML Threat Classification Endpoint ---');
    const classifyReq = {
      body: { duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF' }
    };
    const classifyRes = makeMockRes();
    await mlController.classifyThreat(classifyReq, classifyRes);
    
    assert.strictEqual(classifyRes.statusCode, 200);
    assert.strictEqual(classifyRes.jsonData.success, true);
    assert.ok('is_threat' in classifyRes.jsonData.data);
    console.log('✅ Threat classification endpoint passed!');

    // --- 4. Test Alert Status Change to "Investigating" (Should not auto-generate ML Threat Data) ---
    console.log('\n--- 4. Testing Alert Status Transition (Investigating) ---');
    
    const mockAlert = await Alert.create({
      ruleId: new mongoose.Types.ObjectId(),
      logId: new mongoose.Types.ObjectId(),
      ruleName: 'TEST_ML_ALERT_' + Date.now(),
      description: 'Test ML alert description',
      severity: 'high',
      riskScore: 70,
      status: 'open',
      mitreAttack: { techniqueId: 'T1110', techniqueName: 'Brute Force' },
      affectedIPs: ['192.168.1.10']
    });

    const statusReq = {
      params: { id: mockAlert._id.toString() },
      body: { status: 'investigating' },
      user: { username: 'test_analyst', _id: new mongoose.Types.ObjectId() }
    };
    const statusRes = makeMockRes();
    await alertController.updateAlertStatus(statusReq, statusRes);

    assert.strictEqual(statusRes.statusCode, 200);
    assert.strictEqual(statusRes.jsonData.success, true);
    assert.strictEqual(statusRes.jsonData.data.alert.status, 'investigating');

    // Verify draft incident was created, but NO mlthreatdatas records exist
    const draftIncident = await Incident.findOne({ alertId: mockAlert._id });
    assert.ok(draftIncident, 'A draft incident should be created automatically');
    
    // Check if mlthreatdatas collection exists and query it
    if (collectionNames.includes('mlthreatdatas')) {
      const threatRecords = await mongoose.connection.db.collection('mlthreatdatas').find({}).toArray();
      assert.strictEqual(threatRecords.length, 0, 'No ML Threat Data records should be automatically generated');
    }
    console.log('✅ Alert status transition successfully updated status and skipped auto-generation!');

    // --- 5. Test Incident Report Updates (Should not auto-generate ML Threat Data) ---
    console.log('\n--- 5. Testing Incident Report Auto-generation Skip ---');
    const updateReq = {
      params: { id: draftIncident._id.toString() },
      body: { analystNotes: 'Analyst checked and updated notes.', status: 'under_review' },
      user: { _id: new mongoose.Types.ObjectId() }
    };
    const updateRes = makeMockRes();
    await incidentController.updateReport(updateReq, updateRes);

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.jsonData.success, true);
    assert.strictEqual(updateRes.jsonData.data.incident.analystNotes, 'Analyst checked and updated notes.');
    assert.strictEqual(updateRes.jsonData.data.incident.status, 'under_review');

    // Again, ensure absolutely no ML Threat Data is created
    if (collectionNames.includes('mlthreatdatas')) {
      const threatRecords = await mongoose.connection.db.collection('mlthreatdatas').find({}).toArray();
      assert.strictEqual(threatRecords.length, 0, 'No ML Threat Data records should be generated on incident update');
    }
    console.log('✅ Incident report updates successfully skipped auto-generation!');

    // Cleanup test data
    await Alert.deleteMany({ ruleName: { $regex: '^TEST_ML_' } });
    await Incident.deleteMany({ title: { $regex: '^Incident Report: TEST_ML_' } });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('\n❌ Test Failure:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔒 Database disconnected. Tests finished.');
  }
}

runTests();
