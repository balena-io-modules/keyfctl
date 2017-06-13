'use strict';

const
  _     = require('lodash'),
  file  = require('../shared/file'),
  utils = require('../../../lib/utils')

module.exports = class Ingress {
  constructor(revision, component) {
    this.revision  = revision
    this.component = component
    this.errors    = []
    this.rationale = []
    this.valid     = true
    this.template  = _.get(this, 'component.kubernetes.ingress', Ingress.template())
  }

  writeRelease() {
    if (! this.isValid()) return

    return utils.writeRelease(utils.releasePath(this.component.name), this.release)
  }

  buildRelease() {
    if (! this.isValid()) return

    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['metadata.name' , this.component.name] ,
      ['spec.tls'      , this.tls()]          ,
    ], ([key, val]) => {
      _.set(this.release, key, val)
    })

    // If there are custom rules in the template we need to honor them
    if (_.get(this.template, 'spec.rules')) {
      _.set(this.release, 'spec.rules', _.union(this.rules(), this.template.spec.rules))
    } else {
      _.set(this.release, 'spec.rules', this.rules())
    }

    if (this.tls().length > 0) {
      _.set(this.release, 'metadata.annotations["kubernetes.io/tls-acme"]', true)
    }
  }

  rules() {
    const paths = {}

    _.forEach(this.component.getPorts(), port => {
      if (! paths[port.domain]) {
        paths[port.domain] = []
      }

      paths[port.domain].push({
        path: port.path,
        backend: {
          serviceName: this.component.name,
          servicePort: port.port
        }
      })
    })


    return _.map(paths, (val, key) => {
      return {
        host: key,
        http: {
          paths: val
        }
      }
    })
  }

  tls() {
    return _.map(this.component.getPorts(), port => {
      return {
        secretName: `${this.component.name}-tls`,
        hosts: [ port.domain ]
      }
    })
  }

  isValid() {
    if (this.component.getPorts().length < 1) {
      this.rationale.push('no ports defined')
      this.valid = false

      return false
    }

    if (_.compact(_.map(this.component.getPorts(), port => port.domain)).length < 1) {
      this.valid = false
      this.rationale.push('not using domain functionality of ingress')

      return false
    }

    return true
  }

  static template() {
    return {
      kind: 'Ingress',
      apiVersion: 'extensions/v1beta1',
      spec: {
        tls: [],
        rules: []
      }
    }
  }
}


