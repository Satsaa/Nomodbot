import { promises as fsp } from 'fs'
import fs from 'fs'
import { resolve as pathResolve, parse } from 'path'

import { promiseTimeout } from './util'

// Modified PromiseQueue with per filepath queues

interface Entry {
  func: (...a: any[]) => Promise<any>
  args: any[]
  resolve: (value?: any | PromiseLike<any> | undefined) => void
  reject: (reason?: any) => void
}

const stacks: {[path: string]: Entry[]} = {}
class MultiPromiseQueue {
  public async queue<A extends any[], T>(func: (path: string, ...args: A) => Promise<T>, path: string, ...args: A): Promise<T> {
    return new Promise((resolve, reject) => {
      path = pathResolve(path)

      const stack = stacks[path] || (stacks[path] = [])
      stack.push({ func: func as Entry['func'], args: [path, ...args], resolve, reject })
      if (stack.length === 1) this.loop(stack)
    })
  }
  private async loop(stack: Entry[]) {
    while (stack.length) {
      const entry = stack[0]
      try {
        const res = await entry.func(...entry.args)
        stack.shift()
        entry.resolve(res)
      } catch (err) {
        stack.shift()
        entry.reject(err)
      }
    }
  }
}

const queue = new MultiPromiseQueue()

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronously tests a user's permissions for the file specified by path.
 * @param path A path to a file or directory.
 */
export const access = async (path: string, mode?: number | undefined): Promise<void> => queue.queue(fsp.access, path, mode)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronously append data to a file, creating the file if it does not exist.
 * @param file A path to a file.
 * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
 * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
 * If `encoding` is not supplied, the default of `'utf8'` is used.
 * If `mode` is not supplied, the default of `0o666` is used.
 * If `mode` is a string, it is parsed as an octal integer.
 * If `flag` is not supplied, the default of `'a'` is used.
 */
export const appendFile = async (path: string, data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void> => queue.queue(fsp.appendFile, path, data, options)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous chmod(2) - Change permissions of a file.
 * @param path A path to a file.
 * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
 */
export const chmod = async (path: string, mode: string | number): Promise<void> => queue.queue(fsp.chmod, path, mode)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous chown(2) - Change ownership of a file.
 * @param path A path to a file.
 */
export const chown = async (path: string, uid: number, gid: number): Promise<void> => queue.queue(fsp.chown, path, uid, gid)

/** 
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronously copies `src` to `dest`. By default, `dest` is overwritten if it already exists.
 * Node.js makes no guarantees about the atomicity of the copy operation.
 * If an error occurs after the destination file has been opened for writing, Node.js will attempt
 * to remove the destination.
 * @param src A path to the source file.
 * @param dest A path to the destination file.
 * @param flags An optional integer that specifies the behavior of the copy operation. The only
 * supported flag is `fs.constants.COPYFILE_EXCL`, which causes the copy operation to fail if
 * `dest` already exists.
 */
export const copyFile = async (src: string, dest: fs.PathLike, flags?: number): Promise<void> => queue.queue(fsp.copyFile, src, dest, flags)

/**
 * Asynchronous fchmod(2) - Change permissions of a file.
 * @param handle A `FileHandle`.
 * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
 */
export const fchmod = fsp.fchmod

/**
 * Asynchronous fchown(2) - Change ownership of a file.
 * @param handle A `FileHandle`.
 */
export const fchown = fsp.fchown

/**
 * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
 * @param handle A `FileHandle`.
 */
export const fdatasync = fsp.fdatasync

/**
 * Asynchronous fstat(2) - Get file status.
 * @param handle A `FileHandle`.
 */
export const fstat = fsp.fstat

/**
 * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
 * @param handle A `FileHandle`.
 */
export const fsync = fsp.fsync

/**
 * Asynchronous ftruncate(2) - Truncate a file to a specified length.
 * @param handle A `FileHandle`.
 * @param len If not specified, defaults to `0`.
 */
export const ftruncate = fsp.ftruncate

/**
 * Asynchronously change file timestamps of the file referenced by the supplied `FileHandle`.
 * @param handle A `FileHandle`.
 * @param atime The last access time. If a string is provided, it will be coerced to number.
 * @param mtime The last modified time. If a string is provided, it will be coerced to number.
 */
export const futimes = fsp.futimes

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * .
 * Asynchronous lchmod(2) - Change permissions of a file. Does not dereference symbolic links.
 * @param path A path to a file.
 * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
 */
export const lchmod = async (path: string, mode: string | number): Promise<void> => queue.queue(fsp.lchmod, path, mode)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous lchown(2) - Change ownership of a file. Does not dereference symbolic links.
 * @param path A path to a file.
 */
export const lchown = async (path: string, uid: number, gid: number): Promise<void> => queue.queue(fsp.lchown, path, uid, gid)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous link(2) - Create a new link (also known as a hard link) to an existing file.
 * @param existingPath A path to a file.
 * @param newPath A path to a file.
 */
export const link = async (existingPath: string, newPath: fs.PathLike): Promise<void> => queue.queue(fsp.link, existingPath, newPath)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous lstat(2) - Get file status. Does not dereference symbolic links.
 * @param path A path to a file.
 */
export const lstat = async (path: string): Promise<fs.Stats> => queue.queue(fsp.lstat, path)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous mkdir(2) - create a directory.
 * @param path A path to a file.
 * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
 * should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
 */
export const mkdir = async (path: string, options?: number | string | fs.MakeDirectoryOptions | null): Promise<void> => queue.queue(fsp.mkdir, path, options)

/**
 * Asynchronously creates a unique temporary directory.
 * Generates six random characters to be appended behind a required `prefix` to create a unique temporary directory.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
 */
export const mkdtemp = fsp.mkdtemp

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous open(2) - open and possibly create a file.
 * @param path A path to a file.
 * @param mode A file mode. If a string is passed, it is parsed as an octal integer. If not
 * supplied, defaults to `0o666`.
 */
export const open = async (path: string, flags: string | number, mode?: string | number): Promise<fsp.FileHandle> => queue.queue(fsp.open, path, flags, mode)

/**
 * Asynchronously reads data from the file referenced by the supplied `FileHandle`.
 * @param handle A `FileHandle`.
 * @param buffer The buffer that the data will be written to.
 * @param offset The offset in the buffer at which to start writing.
 * @param length The number of bytes to read.
 * @param position The offset from the beginning of the file from which data should be read. If
 * `null`, data will be read from the current position.
 */
export const read = fsp.read

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronously reads the entire contents of a file.
 * @param path A path to a file.
 * @param options An object that may contain an optional flag.
 * If a flag is not provided, it defaults to `'r'`.
 */
export async function readFile(path: string, options?: { encoding?: null, flag?: string | number } | null): Promise<Buffer>
export async function readFile(path: string, options: { encoding: BufferEncoding, flag?: string | number } | BufferEncoding): Promise<string>
export async function readFile(path: string, options?: { encoding?: string | null, flag?: string | number } | string | null): Promise<string | Buffer> {
  return queue.queue(fsp.readFile, path, options)
}

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous readdir(3) - read a directory.
 * @param path A path to a file.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
 */
export async function readdir (path: string, options?: { encoding?: BufferEncoding | null, withFileTypes?: false } | BufferEncoding | null): Promise<string[]>
export async function readdir (path: string, options: { encoding: 'buffer', withFileTypes?: false } | 'buffer'): Promise<Buffer[]>
export async function readdir (path: string, options?: { encoding?: string | null, withFileTypes?: false } | string | null): Promise<string[] | Buffer[]>
export async function readdir(path: string, options: { encoding?: string | null, withFileTypes: true }): Promise<fs.Dirent[]>
export async function readdir<T extends boolean>(path: string, options?: { encoding?: BufferEncoding | string | null, withFileTypes?: T } | BufferEncoding | string | null): Promise<fs.Dirent[] | string[] | Buffer[]> {
  // @ts-ignore
  return queue.queue(fsp.readdir, path, options)
}

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous readlink(2) - read value of a symbolic link.
 * @param path A path to a file.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
 */
export async function readlink(path: string, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): Promise<string>
export async function readlink(path: string, options: { encoding: 'buffer' } | 'buffer'): Promise<Buffer>
export async function readlink(path: string, options?: { encoding?: string | null } | string | null): Promise<string | Buffer> {
  return queue.queue(fsp.readlink, path, options)
}

/**
 * Asynchronous realpath(3) - return the canonicalized absolute pathname.
 * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
 */
export const realpath = fsp.realpath

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous rename(2) - Change the name or location of a file or directory.
 * @param oldPath A path to a file.
 * @param newPath A path to a file.
 */
export const rename = async (oldPath: string, newPath: fs.PathLike): Promise<void> => queue.queue(fsp.rename, oldPath, newPath)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous rmdir(2) - delete a directory.
 * @param path A path to a file.
 */
export const rmdir = async (path: string): Promise<void> => queue.queue(fsp.rmdir, path)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous stat(2) - Get file status.
 * @param path A path to a file.
 */
export const stat = async (path: string): Promise<fs.Stats> => queue.queue(fsp.stat, path)

/**
 * Asynchronous symlink(2) - Create a new symbolic link to an existing file.
 * @param target A path to an existing file. If a URL is provided, it must use the `file:` protocol.
 * @param path A path to the new symlink. If a URL is provided, it must use the `file:` protocol.
 * @param type May be set to `'dir'`, `'file'`, or `'junction'` (default is `'file'`) and is only available on Windows (ignored on other platforms).
 * When using `'junction'`, the `target` argument will automatically be normalized to an absolute path.
 */
export const symlink = fsp.symlink

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous truncate(2) - Truncate a file to a specified length.
 * @param path A path to a file.
 * @param len If not specified, defaults to `0`.
 */
export const truncate = async (path: string, len?: number): Promise<void> => queue.queue(fsp.truncate, path, len)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronous unlink(2) - delete a name and possibly the file it refers to.
 * @param path A path to a file.
 */
export const unlink = async (path: string): Promise<void> => queue.queue(fsp.unlink, path)

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * 
 * Asynchronously change file timestamps of the file referenced by the supplied path.
 * @param path A path to a file.
 * @param atime The last access time. If a string is provided, it will be coerced to number.
 * @param mtime The last modified time. If a string is provided, it will be coerced to number.
 */
export const utimes = async (path: string, atime: string | number | Date, mtime: string | number | Date): Promise<void> => queue.queue(fsp.utimes, path, atime, mtime)

/**
 * Asynchronously writes `buffer` to the file referenced by the supplied `FileHandle`.
 * It is unsafe to call `fsPromises.write()` multiple times on the same file without waiting for the `Promise`
 * to be resolved (or rejected). For this scenario, `fs.createWriteStream` is strongly recommended.
 * @param handle A `FileHandle`.
 * @param buffer The buffer that the data will be written to.
 * @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
 * @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
 * @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
 */
export const write = fsp.write

/**
 * `Queued`: This action is executed after previous actions are finished on target file.
 * `Temp`: Changes are first applied to a temporary file. Temporary file name is like `name_temp.json`.
 * If the write fails (e.g. due to process kill) the actual file is not overwritten and empty file errors are avoided.
 * If the rename fails with code 'EPERM', the rename will be retried up to 4 times after a delay of [1, 10, 100, 2000] ms.
 * 
 * Asynchronously writes data to a file, replacing the file if it already exists.
 * @param path A path to a file.
 * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
 * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
 * If `encoding` is not supplied, the default of `'utf8'` is used.
 * If `mode` is not supplied, the default of `0o666` is used.
 * If `mode` is a string, it is parsed as an octal integer.
 * If `flag` is not supplied, the default of `'w'` is used.
 */
export const writeFile = async (path: string, data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void> => {
  fsp.writeFile(path, data, options)
  return queue.queue(async (path: string, data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void> => {
    const parsed = parse(path)
    const tempPath = `${parsed.dir}/${parsed.name}${'_temp'}${parsed.ext}`
    await fsp.writeFile(tempPath, data, options)
    try {
      const res = await fsp.rename(tempPath, path)
      return res
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
    await promiseTimeout(1)
    try {
      const res = await fsp.rename(tempPath, path)
      return res
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
    await promiseTimeout(10)
    try {
      const res = await fsp.rename(tempPath, path)
      return res
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
    await promiseTimeout(100)
    try {
      const res = await fsp.rename(tempPath, path)
      return res
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
    await promiseTimeout(2000)
    return fsp.rename(tempPath, path)
  }, path, data, options)
}
