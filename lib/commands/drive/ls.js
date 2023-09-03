import * as HyperStruct from '../../hyper/struct.js'
import { statusLogger } from '../../status-logger.js'
import { parseHyperUrl } from '../../urls.js'

const FULL_USAGE = `
Examples:

  gnostr-hyp drive ls hyper://1234..af/
  gnostr-hyp drive ls hyper://1234..af/foo/bar
`

export default {
  name: 'drive ls',
  description: 'List the entries of the given hyperdrive URL.',
  usage: {
    simple: '{url}',
    full: FULL_USAGE
  },
  command: async function (args) {
    if (!args._[0]) throw new Error('URL is required')

    const statusLog = statusLogger(['Accessing network...'])
    statusLog.print()

    const urlp = parseHyperUrl(args._[0])
    const drive = await HyperStruct.get(urlp.hostname, { expect: 'hyperdrive' })
    const res = await drive.api.promises.readdir(urlp.pathname || '/')

    statusLog.clear()
    console.log(res.join('\n'))

    process.exit(0)
  }
}
