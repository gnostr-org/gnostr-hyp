import { join as joinPath } from 'path'
import chokidar from 'chokidar'
import mkdirp from 'mkdirp'
import dft from 'diff-file-tree'
import chalk from 'chalk'
import debounce from 'p-debounce'
import yesno from 'yesno'
import { getMirroringClient } from '../../hyper/index.js'
import * as HyperStruct from '../../hyper/struct.js'
import { HyperStructInfoTracker } from '../../hyper/info-tracker.js'
import { statusLogger } from '../../status-logger.js'
import { parseHyperUrl } from '../../urls.js'

const SYNC_INTERVAL = 1000
const FULL_USAGE = `
Options:

  --no-add - Don't include additions to the target location.
  --no-overwrite - Don't include overwrites to the target location.
  --no-delete - Don't include deletions to the target location.
  -w/--watch/--live - Continuously sync changes.
  -y/--yes - Do not ask for confirmation

Examples:

  gnostr-hyp drive sync hyper://1234..af/ ./local-folder
  gnostr-hyp drive sync ./local-folder hyper://1234..af/remote-folder --no-delete
  gnostr-hyp drive sync hyper://1234..af/ hyper://fedc..21/
  gnostr-hyp drive sync hyper://1234...af/
  gnostr-hyp drive sync ./local-folder
`

export default {
  name: 'drive sync',
  description: 'Continuously sync changes between two folders in your local filesystem or in hyperdrives.',
  usage: {
    simple: '{source_path_or_url} [target_path_or_url]',
    full: FULL_USAGE
  },
  options: [
    { name: 'add', default: true, boolean: true },
    { name: 'overwrite', default: true, boolean: true },
    { name: 'delete', default: true, boolean: true },
    { name: 'live', default: false, boolean: true },
    { name: 'watch', abbr: 'w', default: false, boolean: true },
    { name: 'yes', abbr: 'y', default: false, boolean: true }
  ],
  command: async function (args) {
    if (!args._[0]) throw new Error('A source path or URL is required')

    const live = args.watch || args.live
    const leftArgs = await parseArgs(args._[0])
    const rightArgs = args._[1] ? await parseArgs(args._[1]) : await createTarget(leftArgs)
    if (!args._[1]) console.error('Creating new hyperdrive...')
    console.error(chalk.bold(`Source: ${leftArgs.raw}`))
    console.error(chalk.bold(`Target: ${rightArgs.raw}`))

    let ok = true

    if (!args.yes) {
      ok = await yesno({
        question: 'Begin sync? [y/N]',
        defaultValue: false
      })
    }

    if (!rightArgs.isHyper) mkdirp.sync(rightArgs.path)
    if (!ok) process.exit(0)
    console.error(live ? 'Live syncing (Ctrl+c to exit)...' : 'Syncing...')

    const statusLines = ['']
    const statusLog = statusLogger(statusLines)
    if (leftArgs.isHyper) await setupTracker(leftArgs.fs.key.toString('hex'), statusLines, statusLog)
    if (rightArgs.isHyper) await setupTracker(rightArgs.fs.key.toString('hex'), statusLines, statusLog)
    statusLog.print(statusLines)

    const left = toDftParam(leftArgs)
    const right = toDftParam(rightArgs)

    await sync(left, right, args, { statusLines, statusLog })
    if (!live) return process.exit(0)

    const watcher = watch(left, debounce(() => sync(left, right, args, { statusLines, statusLog }), SYNC_INTERVAL))
    let exiting = false

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    async function cleanup () {
      if (exiting) return
      console.error('Exiting...')
      exiting = true
      if (watcher.close) await watcher.close()
      else if (watcher.destroy) watcher.destroy()
      process.exit(0)
    }
  }
}

function watch (source, onchange) {
  if (source.fs) return source.fs.watch(source.path, onchange)
  const watcher = chokidar.watch(source, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinished: true
  })
  watcher.on('add', onchange)
  watcher.on('change', onchange)
  watcher.on('unlink', onchange)
  return watcher
}

async function sync (left, right, opts = {}, { statusLines, statusLog }) {
  const si = statusLines.length - 1
  statusLines[si] = 'Comparing...'
  statusLog.print(statusLines)

  let diff = await dft.diff(left, right, {
    compareContent: false
  })

  if (!opts.add || !opts.overwrite || !opts.delete) {
    diff = diff.filter(item => {
      if (item.change === 'add') return opts.add
      if (item.change === 'mod') return opts.overwrite
      if (item.change === 'del') return opts.delete
      return false
    })
  }

  if (diff.length !== 0) {
    await new Promise(resolve => {
      let progress = 0
      const total = diff.length
      const s = dft.applyRightStream(left, right, diff)
      s.on('data', action => {
        progress++
        const pct = Math.round(progress / total * 100)
        const op = ({
          rmdir: 'Deleted',
          unlink: 'Deleted',
          writeFile: 'Wrote',
          mkdir: 'Created'
        })[action.op]
        statusLines[si] = `${pct}% - ${op} ${action.path}`
        statusLog.print(statusLines)
      })
      s.on('error', err => {
        console.error(err.toString())
        process.exit(1)
      })
      s.on('end', resolve)
    })
  }

  statusLines[si] = 'Synced'
  statusLog.print(statusLines)
}

function isUrl (str) {
  return str.startsWith('hyper://') || /^[0-9a-f]{64}/.test(str)
}

async function parseArgs (str) {
  if (isUrl(str)) {
    const urlp = parseHyperUrl(str)
    const drive = await HyperStruct.get(urlp.hostname, { expect: 'hyperdrive' })
    return { fs: drive.api, path: urlp.pathname, url: urlp, raw: str, isHyper: true }
  }
  return { path: '' + str, raw: str, isHyper: false }
}

async function createTarget (source) {
  if (source.url) {
    // If the source is a drive, create a new output directory with the drive key's name.
    const target = joinPath(process.cwd(), source.url.hostname)
    return { path: target, raw: target }
  }
  // If the source is a local directory, create a new drive to copy into.
  const drive = await HyperStruct.create('hyperdrive')
  await getMirroringClient().mirror(drive.key, drive.type)
  return { fs: drive.api, path: '/', raw: drive.url + '/' }
}

function toDftParam ({ fs, path }) {
  return fs ? { fs, path } : path
}

async function setupTracker (key, statusLines, statusLog) {
  const statusLineIndex = statusLines.length - 1
  statusLines[statusLineIndex] = `${chalk.bold(`${key.slice(0, 6)}..${key.slice(-2)}`)}: Loading...`
  statusLines.push('')
  const tracker = new HyperStructInfoTracker(key)

  // periodically update stdout with the status-line
  const output = () => {
    statusLines[statusLineIndex] = tracker.genStatusLine()
    statusLog.print(statusLines)
  }
  setInterval(output, 1e3).unref()

  // periodically calculate the size of the hyper structure
  let firstRun = true
  const updateState = async () => {
    await tracker.fetchState().catch(console.error)
    if (firstRun) {
      output()
      firstRun = false
    }
    setTimeout(updateState, 1e3).unref()
  }
  await updateState()
}
