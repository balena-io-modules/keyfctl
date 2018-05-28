'use strict';

const _          = require('lodash')
const Promise    = require('bluebird')
const execAsync  = Promise.promisify(require('child_process').exec)
const AutoScaler    = require('../models/autoscaler')
const Deployment = require('../models/deployment')
const Service    = require('../models/service')
const Ingress    = require('../models/ingress')
const ConfigMap  = require('../models/configmap')
const Secret     = require('../models/secret')

module.exports = class Kubernetes {
  static deploy(plan) {
    console.error('deploying ' + plan.name + ' via kubernetes')
    return execAsync(`kubectl version`)
    .then(_.trim)
  }

  static plan(options) {
    const { name, spec, config, secrets } = options
    spec.name = name

    const specs = []

    specs.push(new AutoScaler(spec).buildRelease())
    specs.push(new Deployment(spec).buildRelease())
    specs.push(new Service(spec).buildRelease())
    specs.push(new Ingress(spec).buildRelease())
    specs.push(new ConfigMap(spec, config).buildRelease())
    specs.push(new Secret(spec, secrets).buildRelease())

    return {
      name,
      target: 'kubernetes',
      specs: _.compact(specs)
    }
  }
}

