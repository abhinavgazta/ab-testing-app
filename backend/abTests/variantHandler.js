const { evaluateFlag } = require('../featureFlags/evaluator');

async function getVariantResponse(flagName, userId) {
  const variant = await evaluateFlag(flagName, userId);
  if (!variant) {
    return { message: 'Default experience (not in experiment)' };
  }

  switch (flagName) {
    case 'homepage-experiment':
      return variant === 'control'
        ? { message: 'Homepage: Control variant' }
        : { message: `Homepage: ${variant}` };

    case 'cta-color-test':
      return variant === 'blue'
        ? { message: 'CTA: Blue button' }
        : { message: 'CTA: Red button' };

    default:
      return { message: 'Default experience' };
  }
}

module.exports = { getVariantResponse };

