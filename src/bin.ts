#!/usr/bin/env node
// The process boundary, and nothing else: everything testable lives in cli.ts.
import { main } from './cli.js';

process.exitCode = await main(process.argv.slice(2));
