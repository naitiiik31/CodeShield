const HASH_BASE = 31;
const HASH_MOD = 1_000_000_007;

export function hashKgram(kgram) {
  let hash = 0;
  const tokens = kgram.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const tokenValue = tokenToValue(tokens[i]);
    hash = (hash * HASH_BASE + tokenValue) % HASH_MOD;
  }

  return {
    hash,
    position: kgram.position,
    startToken: kgram.position,
    endToken: kgram.position + kgram.tokens.length - 1,
  };
}

export function hashAllKgrams(kgrams) {
  return kgrams.map(hashKgram);
}

function tokenToValue(token) {
  let value = 0;
  for (let i = 0; i < token.length; i++) {
    value = (value * 31 + token.charCodeAt(i)) % HASH_MOD;
  }
  return value;
}
