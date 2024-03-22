import errCode from 'err-code'

import * as dagPb from '@ipld/dag-pb'
import * as dagCbor from '@ipld/dag-cbor'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import Queue from 'p-queue'

import dagPbResolver from './unixfs-v1/index.js'
import rawResolver from './raw.js'
import dagCborResolver from './dag-cbor.js'
import identifyResolver from './identity.js'

/**
 * @typedef {import('../types').Resolver} Resolver
 * @typedef {import('../types').Resolve} Resolve
 */

/**
 * @type {{ [ key: string ]: Resolver }}
 */
const resolvers = {
  [dagPb.code]: dagPbResolver,
  [raw.code]: rawResolver,
  [dagCbor.code]: dagCborResolver,
  [identity.code]: identifyResolver
}

/**
 * @type {Resolve}
 */
function resolve (cid, name, path, toResolve, depth, blockstore, options) {
  const resolver = resolvers[cid.code]

  if (!resolver) {
    throw errCode(new Error(`No resolver for code ${cid.code}`), 'ERR_NO_RESOLVER')
  }

  blockstore = withReadConcurrency(blockstore, options.blockReadConcurrency)

  return resolver(cid, name, path, toResolve, resolve, depth, blockstore, options)
}

/**
 * @param {import('interface-blockstore').Blockstore} blockstore
 * @param {number} concurrency
 * @returns {import('interface-blockstore').Blockstore}
 */
function withReadConcurrency (blockstore, concurrency = Infinity) {
  if (concurrency === Infinity) {
    return blockstore
  }

  const queue = new Queue({ concurrency })
  // @ts-ignore The rest of the interface is unused.
  return {
    get: (key, options = {}) => queue.add(() => blockstore.get(key, options))
  }
}

export default resolve
