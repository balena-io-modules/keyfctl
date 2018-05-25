'use strict';

const
  Promise     = require('bluebird'),
  _           = require("lodash"),
  debug       = require('debug')('keyfctl'),
  capitano    = require('capitano'),
  core        = require('../shared/core'),
  utils       = require('../shared/utils'),
  kubernetes  = require('../shared/kubernetes')
const Keyframe = require('../models/keyframe')
const Configuration = require('../models/configuration')
const Secrets = require('../models/secrets')
const Validator = require('../validator')
const fleetAdapter = require('../adapters/fleet')
const kubernetesAdapter = require('../adapters/kubernetes')

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
  signature: 'help',
  description: 'output general help page',
  action: help
})

capitano.command({
  signature: 'generate',
  options: [{
    signature: 'keyframe',
    parameter: 'keyframe',
    alias: [ 'k' ],
    required: false
  }, {
    signature: 'configuration',
    parameter: 'configuration',
    alias: [ 'c' ],
    required: false
  }, {
    signature: 'secrets',
    parameter: 'secrets',
    alias: [ 's' ],
    required: false
  }, {
    signature: 'write',
    alias: [ 'w' ],
    boolean: true
  }, {
    signature: 'deploy',
    alias: [ 'd' ],
    boolean: true
  }, {
    signature: 'verbose',
    alias: [ 'v' ],
    boolean: true
  }],
  action: (params, options) => {
    if (options.verbose) console.error(options)
    if (_.isString(options.keyframe)){
      options.keyframe = [ options.keyframe ]
    }

    const {
      deploy,
      write,
      verbose,
      keyframe = ['./keyframe.yml'],
      configuration = './configuration.yml',
      secrets = './secrets.yml'
    } = options

    return Promise.join(
      Keyframe.fromFiles(keyframe),
      Configuration.fromFile(configuration),
      Secrets.fromFile(secrets),
      (keyframe, config, secrets) => {
        return Promise.join(
          keyframe.checkConfiguration(config),
          keyframe.checkSecrets(secrets),
          (configRes, secretsRes) => {
            if (configRes[0] && secretsRes[0]) {
              if (verbose) console.error('valid: OK')

              return
            }

            throw new Error(configRes[1].concat(secretsRes[1]).join('\n'))
          }
        )
        .return([keyframe, config, secrets])
      }
    )
    .then(([keyframe, config, secrets]) => {
      keyframe.addDeployAdapter('fleet', fleetAdapter)
      keyframe.addDeployAdapter('kubernetes', kubernetesAdapter)

      const errors = keyframe.checkAdapters()

      if (errors.length > 0) {
        throw new Error(errors)
      }

      const plans = keyframe.plan(config, secrets)
      if (verbose) console.error(JSON.stringify(plans, null, 2))

      if (deploy) {
        return keyframe.deploy(plans)
        .tap(console.error)
        .return(plans)
      }

      return plans
    })
    .filter(plan => plan.target === 'kubernetes')
    .map(plan => {
      if (!write) return plan

      return Promise.map(plan.specs, spec => {
        return utils.writeRelease(utils.releasePath(plan.name), spec)
      })
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
  }
})

capitano.run(process.argv, (err) => {
  if (err != null) {
    help()
    throw new Error(err.stack)
  }
})
