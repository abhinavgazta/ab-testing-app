const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { evaluateFlag, evaluateFlagWithForceInclusion, assignVariant } = require('./featureFlags/evaluator');
const { getFlagConfig } = require('./config/consul');
const { getFlagKeys } = require('./config/consul');
const app = express();
const PORT = 3000;
const cors = require('cors');


app.use(cors());

// flag configuration to be shown live..
app.get('/abtest/flag-config', async (req, res) => {
  const { flagName } = req.query;
  const config = await getFlagConfig(flagName);
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'Flag not found' });
  }
});


// ✅ Simulate Traffic Route (for 100 users)
app.get('/abtest/simulate', async (req, res) => {
  const { flagName, userIds } = req.query;
  const ids = userIds.split(',');

  const config = await getFlagConfig(flagName); // fetch from your store

  const results = ids.map(userId => {
    const result = assignVariant(userId, config);
    return {
      userId,
      variant: result.variant,
      hashValue: result.hashValue,
      reason: result.reason
    };
  });

  res.json(results);
});


// --------------------------------------------------------------------------------
// ✅ Run Single A/B Test Route (force include)
app.get('/abtest/run', async (req, res) => {
  const { flagName, userId, tokenId } = req.query;
  console.log(`Running forced A/B test for flag: ${flagName}, userId: ${userId}, tokenId: ${tokenId}`);

  // Use tokenId in hash-based inclusion logic
  const result = await evaluateFlagWithForceInclusion(flagName, userId, tokenId);

  // Fetch config to get message
  const config = await getFlagConfig(flagName);
  let message = '';
  if (result.variant && config?.ui?.messages) {
    message = config.ui.messages[result.variant] || '';
  }

  console.log(`Result for userId ${userId}, tokenId ${tokenId}:`, result);
  res.json({ userId, tokenId, ...result, message });
});


app.listen(PORT, () => console.log(`A/B testing backend running on port ${PORT}`));
