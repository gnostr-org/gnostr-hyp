import hyperspace from 'hyperspace'

import { setup } from '../../hyper/index.js'
const HyperspaceClient = hyperspace.Client

const FULL_USAGE = `
Examples:

  gnostr-hyp daemon start
`
export default {
  name: 'daemon start',
  description: 'Start the hyperspace daemon.',
  usage: {
    full: FULL_USAGE
  },
  command: async function (args) {
    await setup({ canStartDaemon: true })
    try {
      const client = new HyperspaceClient()
      await client.ready()
      await client.status()
    } catch (err) {
      console.error('Could not start the daemon:')
      console.error(err)
      process.exit(1)
    }
    console.log('Daemon is running.')
    process.exit(0)
  }
}
