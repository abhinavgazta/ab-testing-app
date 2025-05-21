require('dotenv').config();


const Consul = require('consul');

const consul = new Consul({
  host: process.env.CONSUL_HOST,
  port: process.env.CONSUL_PORT,
  promisify: true,
});

const getFlagConfig = async (flagName) => {
  try {
    const key = `feature_flags/${flagName}`;
    console.log(`[Consul] Fetching config from KV Store: ${key}`);
    const result = await consul.kv.get(key);
    // console.log(`[Consul] Result for ${key}:`, result);
    if (!result || !result.Value) {
      return null;
    }
    try {
      // console.log(`Returning value for ${key}:`, result.Value);
      return JSON.parse(result.Value);
    } catch (parseError) {
      console.error(`Error parsing config for flag ${flagName}:`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching config for flag ${flagName}:`, error);
    return null;
  }
};

const getFlagKeys = async () => {
  try {
    const keysResult = await consul.kv.keys('feature_flags/');
    const keyPrefix = 'feature_flags/';
    console.log(`[Consul] Fetching keys with prefix: ${keyPrefix}`);
    if (!keysResult) return [];
    const flagNames = keysResult
      .map(k => k.split('/')[1])
      .filter((v, i, a) => a.indexOf(v) === i);
    return flagNames;
  } catch (error) {
    console.error("Error fetching flag keys", error);
    return [];
  }
};

module.exports = {
  consul,
  getFlagConfig,
  getFlagKeys
};