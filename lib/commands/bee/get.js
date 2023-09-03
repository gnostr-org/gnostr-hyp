import * as HyperStruct from '../../hyper/struct.js'
import { statusLogger } from '../../status-logger.js'
import { fromPathToHyperbeeKeyList, parseHyperUrl } from '../../urls.js'

const FULL_USAGE = `
Examples:

  gnostr-hyp bee get hyper://1234..af/foo
  gnostr-hyp bee get hyper://1234..af/foo/bar
`

export default {
  name: 'bee get',
  description: 'Get the value of an entry of the given hyperbee URL.',
  usage: {
    simple: '{url}',
    full: FULL_USAGE
  },
  command: async function (args) {
    if (!args._[0]) throw new Error('URL is required')

    const statusLog = statusLogger(['Accessing network...'])
    statusLog.print()

    const urlp = parseHyperUrl(args._[0])
    const bee = await HyperStruct.get(urlp.hostname, { expect: 'hyperbee' })

    const path = fromPathToHyperbeeKeyList(urlp.pathname)
    let keyspace = bee.api
    for (let i = 0; i < path.length - 1; i++) {
      keyspace = keyspace.sub(path[i])
    }
    const entry = await keyspace.get(path[path.length - 1])

    statusLog.clear()
    console.log(JSON.stringify(entry.value, null, 2))

    process.exit(0)
  }
}
