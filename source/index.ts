import { createReadStream, createWriteStream, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { extract, pack } from 'tar-fs';
import { createBrotliDecompress, createGzip, createUnzip } from 'zlib';

class LambdaFS {
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
        source.pipe(/br$/i.test(path) ? createBrotliDecompress({ chunkSize: 2 ** 21 }) : createUnzip({ chunkSize: 2 ** 21 })).pipe(target);
      } else {
        source.pipe(target);
      }
    });
  }
}

export = LambdaFS;
