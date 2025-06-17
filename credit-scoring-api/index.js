require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const app = express();
const PORT = process.env.PORT || 5600;
const metricsRoute = require('./metricsRoute');
const notificationsRoute = require('./notificationsRoute');

// Use environment variable for credentials path
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Use environment variable for bucket name
const bucket = storage.bucket(process.env.GCS_BUCKET);

app.use(cors());
app.use(express.json());
app.use(metricsRoute);
app.use(notificationsRoute);

// Get all clients
app.get('/clients', async (req, res) => {
  try {
    console.log('Fetching clients from GCS...');
    const file = bucket.file('clients/clients.json');
    const [contents] = await file.download();
    const clients = JSON.parse(contents.toString());
    res.json(clients);
  } catch (err) {
    console.error('❌ Error loading clients from GCS:', err);
    res.status(500).json({ error: 'Failed to load clients', details: err.message });
  }
});

// Get one client by CID
app.get('/client/:cid', async (req, res) => {
  try {
    console.log(`Fetching client ${req.params.cid} from GCS...`);
    const file = bucket.file('clients/clients.json');
    const [contents] = await file.download();
    const clients = JSON.parse(contents.toString());
    const client = clients.find(c => c.cid === req.params.cid);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (err) {
    console.error('❌ Error loading client by CID:', err);
    res.status(500).json({ error: 'Failed to load client', details: err.message });
  }
});

// Credit scoring logic
const weights = {
  paymentHistory: 0.35,
  creditUtilization: 0.30,
  creditHistoryLength: 0.15,
  creditMix: 0.10,
  newInquiries: 0.10,
};

const logisticWeights = {
  intercept: -4,
  paymentHistory: 5,
  creditUtilization: -3,
  creditHistoryLength: 2,
  creditMix: 1,
  newInquiries: -2,
};

function calculateCreditScore(data) {
  const normalized = {
    paymentHistory: data.paymentHistory / 100,
    creditUtilization: 1 - (data.creditUtilization / 100),
    creditHistoryLength: Math.min(data.creditHistoryLength / 60, 1),
    creditMix: data.creditMix / 100,
    newInquiries: 1 - (data.newInquiries / 100),
  };

  const weightedSum =
    weights.paymentHistory * normalized.paymentHistory +
    weights.creditUtilization * normalized.creditUtilization +
    weights.creditHistoryLength * normalized.creditHistoryLength +
    weights.creditMix * normalized.creditMix +
    weights.newInquiries * normalized.newInquiries;

  return Math.round(300 + weightedSum * 550);
}

function calculateDefaultProbability(data) {
  const z =
    logisticWeights.intercept +
    logisticWeights.paymentHistory * (data.paymentHistory / 100) +
    logisticWeights.creditUtilization * (data.creditUtilization / 100) +
    logisticWeights.creditHistoryLength * (data.creditHistoryLength / 100) +
    logisticWeights.creditMix * (data.creditMix / 100) +
    logisticWeights.newInquiries * (data.newInquiries / 100);

  return parseFloat((1 / (1 + Math.exp(-z))).toFixed(4));
}

function classifyRisk(score) {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

function getRecommendation(category) {
  if (category === 'Poor') return 'REVIEW OR DECLINE';
  if (category === 'Fair') return 'REVIEW';
  return 'APPROVE';
}

// Score endpoint
app.post('/score/:cid', async (req, res) => {
  try {
    console.log(`Scoring client ${req.params.cid}...`);
    const cid = req.params.cid;

    // Load client metrics
    const file = bucket.file(`client-metrics/processed/${cid}.json`);
    const [contents] = await file.download();
    const metrics = JSON.parse(contents.toString());

    const creditScore = calculateCreditScore(metrics);
    const defaultProbability = calculateDefaultProbability(metrics);
    const riskCategory = classifyRisk(creditScore);
    const recommendation = getRecommendation(riskCategory);

    const result = {
      timestamp: new Date().toISOString(),
      cid,
      input: metrics,
      creditScore,
      defaultProbability,
      riskCategory,
      recommendation,
    };

    // Save score result
    const scoreFile = bucket.file(`scores/${cid}.json`);
    await scoreFile.save(JSON.stringify(result, null, 2), {
      contentType: 'application/json',
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Error during scoring:', err);
    res.status(500).json({ error: 'Scoring failed', details: err.message });
  }
});

// Get client loan application data
app.get('/client-loan-data/:cid', async (req, res) => {
  try {
    console.log(`Fetching loan data for client ${req.params.cid}...`);
    const cid = req.params.cid;

    // List all files in the client's directory to find the latest date folder
    const [files] = await bucket.getFiles({
      prefix: `clients/${cid}/`
    });

    if (files.length === 0) {
      return res.status(404).json({ error: 'No loan data found for client' });
    }

    // Get the latest date folder
    const datefolders = files
      .map(file => file.name.split('/')[3])
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      return res.status(404).json({ error: 'No loan data found for client' });
    }

    const latestDate = datefolders[0];

    // Download and parse both JSON files
    // Get reference to files using the correct path with hardcoded date for testing
    const basePath = `clients/${cid}/2025-06-16`;
    const agreementFile = bucket.file(`${basePath}/loan-agreement.json`);
    const applicationFile = bucket.file(`${basePath}/loan-application.json`);

    console.log('Attempting to read files from:');
    console.log(`- ${agreementFile.name}`);
    console.log(`- ${applicationFile.name}`);

    const [agreementContent, applicationContent] = await Promise.all([
      agreementFile.download().then(([content]) => JSON.parse(content.toString())),
      applicationFile.download().then(([content]) => JSON.parse(content.toString()))
    ]);

    // Combine and format the data
    // Check both approved and declined statuses to get the most recent decision
    let status = null;
    let decidedAt = null;
    
    try {
      const approvedFile = bucket.file(`clients-approved/${cid}.json`);
      const declinedFile = bucket.file(`clients-declined/${cid}.json`);
      
      const [approvedExists] = await approvedFile.exists();
      const [declinedExists] = await declinedFile.exists();
      
      let approvedData = null;
      let declinedData = null;
      
      if (approvedExists) {
        const [content] = await approvedFile.download();
        approvedData = JSON.parse(content.toString());
      }
      
      if (declinedExists) {
        const [content] = await declinedFile.download();
        declinedData = JSON.parse(content.toString());
      }
      
      // Compare timestamps to get most recent decision
      if (approvedData && declinedData) {
        const approvedDate = new Date(approvedData.decidedAt);
        const declinedDate = new Date(declinedData.decidedAt);
        
        if (approvedDate > declinedDate) {
          status = 'approved';
          decidedAt = approvedData.decidedAt;
        } else {
          status = 'declined';
          decidedAt = declinedData.decidedAt;
        }
      } else if (approvedData) {
        status = 'approved';
        decidedAt = approvedData.decidedAt;
      } else if (declinedData) {
        status = 'declined';
        decidedAt = declinedData.decidedAt;
      }
    } catch (err) {
      console.log('Error checking approval/decline status:', err);
    }

    const response = {
      cid,
      approvedAmount: agreementContent.borrowerRequest,
      recommendedAmount: applicationContent.loanAmount,
      purpose: applicationContent.purpose,
      description: applicationContent.description,
      term: applicationContent.term,
      repaymentMethod: agreementContent.repaymentMethod,
      interestRate: agreementContent.interestRate,
      amountDue: agreementContent.amountDue,
      creditScore: applicationContent.scoreData.creditScore,
      riskCategory: applicationContent.scoreData.riskCategory,
      recommendation: applicationContent.scoreData.recommendation,
      signedAt: agreementContent.signedAt,
      status,
      decidedAt
    };

    res.json(response);
  } catch (err) {
    console.error('❌ Error fetching loan data:', err);
    res.status(500).json({ error: 'Failed to fetch loan data', details: err.message });
  }
});

// Handle loan approval/rejection
app.post('/loan/:cid/decision', async (req, res) => {
  try {
    console.log(`Processing loan decision for client ${req.params.cid}...`);
    const { decision, approvedAmount } = req.body;
    const cid = req.params.cid;

    console.log('Received decision:', decision);
    console.log('Approved amount:', approvedAmount);

    if (!['approved', 'declined'].includes(decision)) {
      console.log('Invalid decision:', decision);
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Get the latest loan data
    const basePath = `clients/${cid}/2025-06-16`;
    console.log('Looking for loan application at:', basePath);
    
    const applicationFile = bucket.file(`${basePath}/loan-application.json`);
    const [exists] = await applicationFile.exists();
    
    if (!exists) {
      console.log('Application file not found');
      return res.status(404).json({ error: 'Loan application not found' });
    }

    console.log('Found application file, downloading...');
    const [applicationContent] = await applicationFile.download();
    const loanData = JSON.parse(applicationContent.toString());
    console.log('Loan data loaded:', loanData);

    // Create the decision object with current timestamp and approved amount
    const now = new Date().toISOString();
    const decisionData = {
      ...loanData,
      status: decision,
      decidedAt: now,
      approvedAmount: decision === 'approved' ? approvedAmount : undefined
    };

    // Make sure target folders exist
    const targetFolder = decision === 'approved' ? 'clients-approved' : 'clients-declined';
    console.log('Creating decision file in:', targetFolder);
    
    // Create folder if it doesn't exist (folders are implicit in GCS)
    const decisionFile = bucket.file(`${targetFolder}/${cid}.json`);
    
    console.log('Saving decision data...');
    await decisionFile.save(JSON.stringify(decisionData, null, 2), {
      contentType: 'application/json',
    });
    console.log('Decision data saved successfully');

    // Update the main clients.json file
    console.log('Updating main clients list...');
    const clientsFile = bucket.file('clients/clients.json');
    const [clientsContent] = await clientsFile.download();
    const clients = JSON.parse(clientsContent.toString());
    
    const updatedClients = clients.map(c =>
      c.cid === cid ? { ...c, status: decision, decidedAt: now } : c
    );
    
    await clientsFile.save(JSON.stringify(updatedClients, null, 2), {
      contentType: 'application/json',
    });
    console.log('Main clients list updated');

    res.json({
      message: `Loan ${decision} successfully`,
      status: decision
    });
  } catch (err) {
    console.error(`❌ Error processing loan decision:`, err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({
      error: 'Failed to process loan decision',
      details: err.message,
      stack: err.stack
    });
  }
});

// Update loan amount
app.post('/loan/:cid/amount', async (req, res) => {
  try {
    console.log(`Updating loan amount for client ${req.params.cid}...`);
    const { amount } = req.body;
    const cid = req.params.cid;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get the latest loan data path
    const basePath = `clients/${cid}/2025-06-16`;
    const agreementFile = bucket.file(`${basePath}/loan-agreement.json`);
    const [exists] = await agreementFile.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Loan agreement not found' });
    }

    // Update loan agreement with new amount
    const [agreementContent] = await agreementFile.download();
    const agreement = JSON.parse(agreementContent.toString());
    
    // Update the amount
    agreement.borrowerRequest = amount;

    // Recalculate amount due with 5% interest
    const interest = amount * 0.05;
    agreement.amountDue = amount + interest;
    
    // Save updated agreement
    await agreementFile.save(JSON.stringify(agreement, null, 2), {
      contentType: 'application/json',
    });

    res.json({
      message: 'Loan amount updated successfully',
      updatedAmount: amount,
      amountDue: agreement.amountDue
    });

  } catch (err) {
    console.error('❌ Error updating loan amount:', err);
    res.status(500).json({ error: 'Failed to update loan amount', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Credit Scoring API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Using GCS bucket: ${process.env.GCS_BUCKET}`);
});