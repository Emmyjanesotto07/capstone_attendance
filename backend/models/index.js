'use strict';

import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// Note: This file is deprecated. Models are imported directly in server.js
// Keeping it for backward compatibility

const db = {};

export default db;
