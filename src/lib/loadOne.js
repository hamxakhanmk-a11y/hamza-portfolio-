// Loads one row that may legitimately not exist (null means "no such item"). A slow or failed database
// answer is retried once and then thrown, so the error page (with "Try again") shows instead of a false
// "page not found" for something that does exist.
export async function loadOne(makeQuery) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await makeQuery().maybeSingle();
      if (!error) return data;
      if (error.code === '22P02') return null; // not a valid id at all
      lastError = error;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Database request failed: ${lastError?.message || lastError}`);
}
