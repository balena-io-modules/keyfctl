'use strict';

const
  _     = require('lodash')

module.exports = class Ingress {
  constructor(spec) {
    this.spec = spec
    this.template  = _.get(this.spec, 'kubernetes.ingress', Ingress.template())
    this.release = undefined
  }

  buildRelease() {
    if (!this.anyPorts()) return
    if (this.hostNetwork()) return

    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['metadata.name' , this.spec.name] ,
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
      _.set(this.release, 'metadata.annotations["kubernetes.io/tls-acme"]', 'true')
    }

    return this.release
  }

  rules() {
    const paths = {}

    _.forEach(this.getPorts(), port => {
      if (! paths[port.domain]) {
        paths[port.domain] = []
      }

      paths[port.domain].push({
        path: port.path,
        backend: {
          serviceName: this.spec.name,
          servicePort: parseInt(port.port, 10)
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

  anyPorts() {
    return this.getPorts().length > 0
  }

  getPorts() {
    return _.get(this.spec, 'ports', [])
  }

  hostNetwork() {
      return _.get(this.spec, 'hostNetwork')
  }

  tls() {
    return _.map(this.getPorts(), port => {
      return {
        secretName: `${this.spec.name}-${port.name || 'defaultport'}-tls`,
        hosts: [ port.domain ]
      }
    })
  }

  static template() {
    return {
      kind: 'Ingress',
      apiVersion: 'extensions/v1beta1',
      metadata: null,
      spec: {
        tls: [],
        rules: []
      }
    }
  }
}

