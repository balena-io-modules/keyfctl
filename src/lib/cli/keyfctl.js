'use strict';

const
  Promise     = require('bluebird'),
  _           = require("lodash"),
  debug       = require('debug')('keyfctl'),
  capitano    = require('capitano'),
  core        = require('../shared/core'),
  utils       = require('../shared/utils')

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
  signature: 'k8s',
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

    if (options.vv) {
      Promise.longStackTraces()
      utils.inspect('options: ', options)
    }

    let res = core.generateFrames('HEAD')
    .catch(err => {
      throw new Error(err)
    })

    if (options.verbose) {
      res.tap(frames => {
        console.log('==> All frames')
        for (let frame of frames) {
          // Output some feedback about the frame history
          console.log(utils.printFormatFrame(frame))
        }
      })
    }

    res = res.filter(frame => {
      // Get rid of any frames that aren't deployable or are redundant
      return frame.action !== 'noop'
    })

    if (options.component != null) {
      res = res.filter(frame => {
        // Get rid of any frames that aren't deployable or are redundant
        return frame.component.name == options.component
      })
    }

    if (options.verbose) {
      res.tap(frames => {
        console.log('==> Valid frames')
        for (let frame of frames) {
          // Output some feedback about the frame history
          console.log(utils.printFormatFrame(frame))
        }
      })
    }

    if (!options.writeall) {
      res = res.filter(frame => core.newRelease(frame, options))
      .tap(frames => {
        console.error('==> New frames')
        for (let frame of frames) {
          // Output some feedback about the frame history
          console.error(utils.printFormatFrame(frame))
          if (options.vv) utils.inspect(frame)
        }
      })
    }

    // unless writing to disk is disabled, write + commit
    if (!options['nowrite']) {
      // write each frame into a commit, (unless --nocommit) unless it already exists
      res.mapSeries(frame => core.write(frame, !options['nocommit']))
      .catch(err => {
        console.error(err.message)
        process.exit(1)
      })
    }
  }
})

capitano.run(process.argv, (err) => {
  if (err != null) {
    help()
    throw new Error(err.stack)
  }
})

