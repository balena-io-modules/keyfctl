'use strict';

const _ = require('lodash')
const Promise = require('bluebird')
const execAsync = Promise.promisify(require('child_process').exec)

module.exports = class Fleet {
  static deploy(plan) {
    console.error('deploying ' + plan.name + ' via fleet')
    return execAsync(`ssh -o ConnectTimeout=15 manager.resinstaging.io enter ${plan.name} 'docker exec resin-${plan.name} head CHANGELOG.md | grep "##"'`)
    .then(res => {
      return _(res).split(' ').compact().value()[1]
    })
  }

  static plan(options) {
    const { name, spec } = options

    return {
      name,
      target: 'fleet',
      spec: {
        action: 'update',
        image: spec.image
      }
    }
  }
}

