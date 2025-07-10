export async function fetchWithRetry(url, options, retries = 3, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res;
        } catch (err) {
            console.warn(`Fetch attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
}
