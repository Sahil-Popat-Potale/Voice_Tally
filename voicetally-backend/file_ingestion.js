const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xml2js = require('xml2js');

// Store data in memory
let cachedSales = [];
let lastLoadTime = 0;

const DATA_FILE_PATH = process.env.DATA_FILE_PATH || path.join(__dirname, 'data', 'sales.csv');

/**
 * Normalizes a record into a standard format
 * @param {Object} record - Raw record from CSV/XML
 * @returns {Object} Normalized record
 */

function normalizeRecord(record) {
    // CSV columns might be: Date, Customer, Amount, Status
    // XML might be nested. handling simple case first.

    // Auto-detect keys (simple heuristic)
    const amountKey = Object.keys(record).find(k => k.toLowerCase().includes('amount')) || 'amount';
    const dateKey = Object.keys(record).find(k => k.toLowerCase().includes('date')) || 'date';
    const customerKey = Object.keys(record).find(k => k.toLowerCase().includes('customer') || k.toLowerCase().includes('party')) || 'customer';

    const amount = parseFloat(record[amountKey]);
    const date = new Date(record[dateKey]); // Strict parsing needed in prod

    // Validation
    if (isNaN(amount)) return null;
    if (isNaN(date.getTime())) return null;

    return {
        date: date.toISOString(),
        customer: record[customerKey] || 'Unknown',
        amount: amount,
        status: (record.status || 'Paid').toLowerCase() // Default
    };
}

/**
 * Loads and parses the data file
 */
async function loadData() {
    // Simple caching: Reload if file changed? For MVP, reload on request or interval.
    // Let's reload every request for "live" feel, or use FS watch.
    // For safety, just load.

    if (!fs.existsSync(DATA_FILE_PATH)) {
        console.warn(`[Data] File not found: ${DATA_FILE_PATH}`);
        return [];
    }

    const ext = path.extname(DATA_FILE_PATH).toLowerCase();
    const results = [];

    if (ext === '.csv') {
        return new Promise((resolve, reject) => {
            fs.createReadStream(DATA_FILE_PATH)
                .pipe(csv())
                .on('data', (data) => {
                    const normalized = normalizeRecord(data);
                    if (normalized) results.push(normalized);
                })
                .on('end', () => {
                    cachedSales = results;
                    resolve(results);
                })
                .on('error', reject);
        });
    } else if (ext === '.xml') {
        const parser = new xml2js.Parser({ explicitArray: false });
        const xml = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const result = await parser.parseStringPromise(xml);
        // Assuming Tally XML export structure (Voucher/Ledger) - Simplified for MVP
        // Need to traverse `result` to find rows.
        // Mocking structure traversal...
        // For MVP, if XML is unsupported structure, return empty.
        console.log("XML parsing implemented but structure dependent.");
        return [];
    }

    return results;
}

/**
 * Filters sales data
 * @param {Object} filters - { period: 'week'|'month', from, to }
 */
async function getSales(filters = {}) {
    await loadData(); // Reload data

    let filtered = cachedSales;
    const now = new Date();

    if (filters.period === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        filtered = filtered.filter(r => new Date(r.date) >= lastWeek);
    } else if (filters.period === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(r => new Date(r.date) >= lastMonth);
    }

    // Compute aggregations
    const total = filtered.reduce((sum, r) => sum + r.amount, 0);
    const count = filtered.length;

    return {
        period: filters.period || 'all',
        total: total,
        transaction_count: count,
        currency: "INR",
        detailed_records: filtered.slice(0, 10) // Limit rows for security
    };
}

module.exports = { getSales, loadData };
