require('dotenv').config();
const express = require('express');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Use environment variables for configuration
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

// Process metrics for a client
router.post('/metrics/:cid', async (req, res) => {
  try {
    const cid = req.params.cid;
    console.log(`Processing metrics for client ${cid}...`);
    
    const file = bucket.file(`client-metrics/${cid}-raw.json`);
    const [contents] = await file.download();
    const raw = JSON.parse(contents.toString());

    // Compute Payment History
    const totalPayments = raw.paymentHistoryLog.reduce((sum, l) => sum + l.onTimePayments + l.latePayments, 0);
    const onTimePayments = raw.paymentHistoryLog.reduce((sum, l) => sum + l.onTimePayments, 0);
    const paymentHistory = (onTimePayments / totalPayments) * 100;

    // Compute Credit Utilization
    const creditUtilization = (raw.utilizationData.totalUsed / raw.utilizationData.totalCreditLimit) * 100;

    // Compute Credit History Length (in months)
    const creditHistoryLength = Math.floor(
      (Date.now() - new Date(raw.creditHistoryStartDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Compute Credit Mix
    const creditMix = Math.min(raw.creditAccounts.length * 10, 100);

    // Compute New Inquiries (past 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const newInquiries = raw.loanHistory?.filter(entry => {
      const appliedDate = new Date(entry.dateApplied);
      return appliedDate >= oneYearAgo;
    }).length || 0;

    const computedMetrics = {
      cid,
      paymentHistory,
      creditUtilization,
      creditHistoryLength,
      creditMix,
      newInquiries,
    };

    // Save processed metrics
    const processedFile = bucket.file(`client-metrics/processed/${cid}.json`);
    await processedFile.save(JSON.stringify(computedMetrics, null, 2), {
      contentType: 'application/json',
    });

    console.log(`✅ Metrics processed for client ${cid}`);
    res.json(computedMetrics);
  } catch (err) {
    console.error('❌ Failed to compute metrics:', err);
    res.status(500).json({ error: 'Failed to compute and upload metrics', details: err.message });
  }
});

module.exports = router;