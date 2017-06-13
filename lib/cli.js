'use strict';

const
  Promise     = require('bluebird'),
  _           = require("lodash"),
  debug       = require('debug')('keyfctl'),
  capitano    = require('capitano'),
  Keyfctl        = require('../lib/keyfctl'),
  utils       = require('../lib/utils')

const help = (params, options) => {
  console.log(`Usage: keyfctl [COMMANDS] [OPTIONS]`)
  console.log('\nCommands:\n')

  for (let command of capitano.state.commands) {
    if (command.isWildcard()) continue
    console.log(`\t${command.signature}\t\t\t${command.description}`)
  }
}

const parseGlobalOpts = (options) => {
  if (options.help) {
    help()
    process.exit(0)
  }
}

capitano.command({
  signature: '*',
  action: help
})

capitano.command({
  signature: 'help',
  description: 'output general help page',
  action: help
})

capitano.globalOption({
  signature: 'help',
  boolean: true,
  alias: ['h'],
})

capitano.globalOption({
  signature: 'verbose',
  boolean: true,
  alias: [ 'v' ],
  required: false
})

capitano.globalOption({
  signature: 'vv', // this is a hack until we have multiple bool support
  boolean: true,
  required: false
})

capitano.command({
  signature: 'lint <base> <head>',
  options: [{
    signature: 'nowrite',
    boolean: true,
    required: false
  }, {
    signature: 'nocommit',
    boolean: true,
    required: false
  }, {
    signature: 'writeall',
    boolean: true,
    required: false
  }, {
    signature: 'component',
    alias: [ 'c' ],
    parameter: 'component',
    required: false
  }],
  action: (params, options) => {
    parseGlobalOpts(options)

    Keyfctl.lint(params.base, params.head)
    .then(console.log)
  }
})

capitano.run(process.argv, (err) => {
  if (err != null) {
    help()
    throw new Error(err.stack)
  }
})

