import { createReadStream, createWriteStream, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { extract, pack } from 'tar-fs';
import { createBrotliDecompress, createGzip, createUnzip } from 'zlib';

class LambdaFS {
  private static _brotli: any;

  /**
   * Lazy loads the appropriate Brotli decompression package.
   * On Node 10.16+ it's provided natively by the `zlib` module.
   * On Node 8.10 runtime (under AWS Lambda) a compatible `iltorb` package is provided.
   */
  static get brotli(): typeof createBrotliDecompress {
    if (createBrotliDecompress !== undefined) {
      return createBrotliDecompress;
    }

    if (this.hasOwnProperty('_brotli') !== true) {
      let iltorb = 'iltorb';

      if (process.env.AWS_EXECUTION_ENV === 'AWS_Lambda_nodejs8.10') {
        iltorb = join(__dirname, 'iltorb');
      }

      try {
        this._brotli = require(iltorb).decompressStream;
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to load 'iltorb' package.`);
        }

        throw error;
      }
    }

    return this._brotli;
  }

  /**
   * Compresses a file/folder with Gzip and returns the path to the compressed (tarballed) file.
   *
   * @param path Path of the file/folder to compress.
   */
  static deflate(path: string): Promise<string> {
    let output = join(tmpdir(), [basename(path), statSync(path).isDirectory() ? 'tar.gz' : 'gz'].join('.'));

    return new Promise((resolve, reject) => {
      let source = output.endsWith('.tar.gz') ? pack(path) : createReadStream(path, { highWaterMark: 2 ** 23 });
      let target = createWriteStream(output, { mode: 0o644 });

      source.once('error', (error: Error) => {
        return reject(error);
      });

      target.once('error', (error: Error) => {
        return reject(error);
      });

      target.once('close', () => {
        return resolve(output);
      });

      source.pipe(createGzip({ chunkSize: 2 ** 21 })).pipe(target);
    });
  }

  /**
   * Decompresses a (tarballed) Brotli or Gzip compressed file and returns the path to the decompressed file/folder.
   *
   * @param path Path of the file to decompress.
   */
  static inflate(path: string): Promise<string> {
    let output = join(tmpdir(), basename(path).replace(/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz)|br|gz)$/i, ''));

    return new Promise((resolve, reject) => {
      if (existsSync(output) === true) {
        return resolve(output);
      }

      let source = createReadStream(path, { highWaterMark: 2 ** 23 });
      let target = null;

      if (/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz))$/i.test(path) === true) {
        target = extract(output);

        target.once('finish', () => {
          return resolve(output);
        });
      } else {
        target = createWriteStream(output, { mode: 0o700 });
      }

      source.once('error', (error: Error) => {
        return reject(error);
      });

      target.once('error', (error: Error) => {
        return reject(error);
      });

      target.once('close', () => {
        return resolve(output);
      });

      if (/(?:br|gz)$/i.test(path) === true) {
        source.pipe(/br$/i.test(path) ? LambdaFS.brotli({ chunkSize: 2 ** 21 }) : createUnzip({ chunkSize: 2 ** 21 })).pipe(target);
      } else {
        source.pipe(target);
      }
    });
  }
}

export = LambdaFS;
