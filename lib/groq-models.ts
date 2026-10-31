/** Production text models; the old Llama fallbacks require enterprise access. */
export function getGroqTextModels(configured?: string) {
  const unavailableDefaults = new Set(['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);
  return [...new Set([configured?.trim(), 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'].filter((model): model is string => typeof model === 'string' && model.length > 0 && !unavailableDefaults.has(model)))];
}

