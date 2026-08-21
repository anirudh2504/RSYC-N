/**
 * The MongoDB connection.
 *
 * The promise is cached at module scope on purpose. On a serverless host the
 * same process is reused across invocations, and opening a fresh connection
 * each time exhausts the connection pool within minutes. Holding one promise
 * means the second invocation reuses the socket the first one opened.
 */

import mongoose from 'mongoose';
import { config } from './config.js';

let connecting = null;

export function isConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connect() {
  if (!config.mongoUri) {
    throw new Error(
      'MONGODB_URI is not set. Put your Atlas connection string in server/.env — see .env.example.',
    );
  }

  if (isConnected()) return mongoose.connection;

  if (!connecting) {
    mongoose.set('strictQuery', true);
    connecting = mongoose
      .connect(config.mongoUri, {
        // Fail fast with a readable message rather than hanging on boot.
        serverSelectionTimeoutMS: 10000,
        // A club this size never needs more, and free tiers cap connections.
        maxPoolSize: 5,
      })
      .catch((err) => {
        connecting = null; // let the next request try again
        throw err;
      });
  }

  await connecting;
  return mongoose.connection;
}

export async function disconnect() {
  connecting = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
