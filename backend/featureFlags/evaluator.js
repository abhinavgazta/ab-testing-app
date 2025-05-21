const crypto = require('crypto');
const { getFlagConfig } = require('../config/consul');

function hashToInt(input) {
  return parseInt(crypto.createHash('sha256').update(input).digest('hex').slice(0, 8), 16);
}

function hashUser(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return parseInt(hash.slice(0, 6), 16) % 10000; // Map to [0, 9999]
}

// // ✅ Deterministic variant assignment
// function assignVariant(config, userId, flagName) {
//   const variantIndex = hashToInt(`${userId}-${flagName}`) % config.variants.length;
//   return config.variants[variantIndex];
// }

function assignVariant(userId, config) {
  const { samplingRate = 100, variants = [] } = config;

  if (!Array.isArray(variants) || variants.length !== 2) {
    return { variant: 'Excluded', reason: 'Require exactly 2 variants', hashValue: null };
  }

  // 1. Hash userId
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16); // First 8 hex chars for consistency
  const hashBucket = hashInt % 100; // Hash bucket 0–99

  // 2. Respect sampling rate
  if (hashBucket >= samplingRate) {
    return {
      variant: 'Excluded',
      reason: `Excluded due to samplingRate (${samplingRate}%)`,
      hashValue: hashBucket,
    };
  }

  // 3. Strict 50/50 variant assignment among sampled users
  const variant = hashBucket < samplingRate / 2 ? variants[0] : variants[1];

  return {
    variant,
    reason: 'Sampled and assigned to variant',
    hashValue: hashBucket,
  };
}


// ✅ Used for Simulate Traffic (respect sampling rate)
async function evaluateFlag(flagName, userId) {
  const config = await getFlagConfig(flagName);
  if (!config || !config.active) return { variant: null, included: false, reason: "inactive_or_missing" };

  const hashValue = hashToInt(`${flagName}-${userId}`) % 10000;
  const included = hashValue < config.samplingRate * 100;

  if (!included) return { variant: null, included, hashValue, reason: "excluded_by_sampling" };

  const assigned = assignVariant(config, userId, flagName);
  return { variant: assigned, included, hashValue };
}




// ✅ Used for single A/B test (always include)
async function evaluateFlagWithForceInclusion(flagName, userId, tokenId = '') {
  const config = await getFlagConfig(flagName);
  if (!config || !config.active) {
    return { included: false, reason: 'flag_inactive' };
  }
  // Combine userId and tokenId for consistent hashing
  const combinedId = `${userId}:${tokenId}`;
  const hashValue = hashUser(combinedId);
  const maxHash = 10000;
  const threshold = config.samplingRate * maxHash;

  const included = hashValue < threshold;
  if (!included) {
    return { included: false, hashValue, reason: 'excluded_due_to_sampling' };
  }

  const variantIndex = hashValue % config.variants.length;
  const variant = config.variants[variantIndex];

  return {
    included: true,
    variant,
    hashValue,
    reason: 'force_included'
  };
}


module.exports = {
  evaluateFlag,
  evaluateFlagWithForceInclusion,
  assignVariant
};

