import chalk from 'chalk'

export default function usage (commands, err, cmd) {
  if (err) {
    console.error(chalk.red(`${err}\n`))
  } else {
    console.error('')
  }

  if (cmd) {
    console.error(simple(cmd))
    if (cmd.usage.full) console.error(cmd.usage.full)
    else console.error('')
    process.exit(err ? 1 : 0)
  }

  console.error(`Usage: ${chalk.bold(`gnostr-hyp`)} <command> ${chalk.gray(`[opts...]`)}

${chalk.bold(`General Commands:`)}

  ${simple(commands.info)}
  ${simple(commands.seed)}
  ${simple(commands.unseed)}
  ${simple(commands.create)}

  ${simple(commands.beam)}

${chalk.bold(`Hyperdrive Commands:`)}

  ${simple(commands.driveLs)}
  ${simple(commands.driveMkdir)}
  ${simple(commands.driveRmdir)}

  ${simple(commands.driveCat)}
  ${simple(commands.drivePut)}
  ${simple(commands.driveRm)}

  ${simple(commands.driveDiff)}
  ${simple(commands.driveSync)}

  ${simple(commands.driveHttp)}

${chalk.bold(`Hyperbee Commands:`)}

  ${simple(commands.beeLs)}
  ${simple(commands.beeGet)}
  ${simple(commands.beePut)}
  ${simple(commands.beeDel)}

${chalk.bold(`Daemon Commands:`)}

  ${simple(commands.daemonStatus)}
  ${simple(commands.daemonStart)}
  ${simple(commands.daemonStop)}

${chalk.bold(`Aliases:`)}

  ${chalk.bold('gnostr-hyp sync')} -> gnostr-hyp drive sync
  ${chalk.bold('gnostr-hyp diff')} -> gnostr-hyp drive diff
  ${chalk.bold('gnostr-hyp ls')} -> gnostr-hyp drive ls
  ${chalk.bold('gnostr-hyp cat')} -> gnostr-hyp drive cat
  ${chalk.bold('gnostr-hyp put')} -> gnostr-hyp drive put

  ${chalk.green(`Learn more at https://github.com/gnostr-org/gnostr-hyp`)}
`)
  process.exit(err ? 1 : 0)
}

function simple (cmd) {
  return `${chalk.bold(`gnostr-hyp ${cmd.name}`)} ${cmd.usage.simple ? `${cmd.usage.simple} -` : `-`} ${cmd.description}`
}
