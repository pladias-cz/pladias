#!/usr/bin/env node

/**
 * Script to sort JSON translation keys alphabetically while preserving structure
 * Usage: node scripts/sort-translation-keys.js <input-file> [output-file]
 * 
 * If output-file is not provided, the input file will be overwritten.
 *
 * # Sort in place (overwrites input file)
 * node sort-translation-keys.js ../src/locales/cs/translation.json
 *
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively sort object keys alphabetically
 * @param {*} obj - The value to sort (object, array, or primitive)
 * @returns {*} - Sorted object or original value
 */
function sortKeysRecursively(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortKeysRecursively(item));
  }

  const sortedObj = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sortedObj[key] = sortKeysRecursively(obj[key]);
  }

  return sortedObj;
}

/**
 * Write JSON with proper formatting (2-space indentation)
 * @param {*} obj - Object to serialize
 * @returns {string} - Formatted JSON string
 */
function toJSONString(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node scripts/sort-translation-keys.js <input-file> [output-file]');
    console.error('Example: node scripts/sort-translation-keys.js frontend/src/locales/cs/translation.json');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile;

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' not found.`);
    process.exit(1);
  }

  // Read and parse JSON
  let data;
  try {
    const content = fs.readFileSync(inputFile, 'utf8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Error parsing JSON from '${inputFile}': ${error.message}`);
    process.exit(1);
  }

  // Sort keys recursively
  const sortedData = sortKeysRecursively(data);

  // Write output
  try {
    fs.writeFileSync(outputFile, toJSONString(sortedData), 'utf8');
    console.log(`Successfully sorted keys in '${outputFile}'`);
  } catch (error) {
    console.error(`Error writing to '${outputFile}': ${error.message}`);
    process.exit(1);
  }
}

main();