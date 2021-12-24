#!/usr/bin/env node

const { createReadStream, createWriteStream, existsSync, statSync } = require('fs');
const { basename, dirname, join, resolve } = require('path');
const { pack } = require('tar-fs');
const { constants, createBrotliCompress } = require('zlib');

try {
  let input = process.argv.slice(2).shift();

  if (input == null) {
    throw new Error(`You must specify a path to compress.`);
  }

  input = resolve(input);

  if (existsSync(input) !== true) {
    throw new Error(`The provided path doesn't exist.`);
  }

  let output = join(dirname(input), [basename(input), statSync(input).isDirectory() ? 'tar.br' : 'br'].join('.'));
  let source = output.endsWith('.tar.br') ? pack(input) : createReadStream(input, { highWaterMark: 2 ** 20 });
  let target = createWriteStream(output, { mode: 0o644 });

  source.once('error', (error) => {
    throw error;
  });

  target.once('error', (error) => {
    throw error;
  });

  let size = statSync(input).isFile() ? statSync(input).size : 0;
  let stream = createBrotliCompress({
    chunkSize: 2 ** 20,
    params: {
      [constants.BROTLI_PARAM_LGBLOCK]: constants.BROTLI_MAX_INPUT_BLOCK_BITS,
      [constants.BROTLI_PARAM_LGWIN]: constants.BROTLI_MAX_WINDOW_BITS,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: size,
    },
  });

  let read = 0;
  let written = 0;

  target.on('open', () => {
    process.stdout.write(`Compressing '${input}' to '${basename(output)}'...`);
  });

  source.on('data', (chunk) => {
    read += chunk.length / 2 ** 20;
  });

  stream.on('data', (chunk) => {
    written += chunk.length / 2 ** 20;

    if (written > 0) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }

    process.stdout.write(`Compressing '${input}' (${read.toFixed(2)} MiB) to '${basename(output)}' (${written.toFixed(2)} MiB)...`);
  });

  target.once('close', () => {
    if (written > 0) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }

    process.stdout.write(`Compressed '${input}' (${read.toFixed(2)} MiB) to '${basename(output)}' (${written.toFixed(2)} MiB).`);
  });

  process.on('exit', () => {
    process.stdout.write(`\n`);
  });

  source.pipe(stream).pipe(target);
} catch (error) {
  if (error.message.length > 0) {
    console.error(`ERROR: ${error.message.trim()}`);
  }

  process.exit(1);
}
