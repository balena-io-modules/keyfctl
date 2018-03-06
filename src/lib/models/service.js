'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Service {
  constructor(spec) {
    this.spec = spec
    this.template  = _.get(this.spec, 'kubernetes.service', Service.template())
  }

  writeRelease() {
    return utils.writeRelease(utils.releasePath(this.spec.name), this.release)
  }

  ports() {
    return _.map(_.get(this.spec, 'ports', []), port => {
      return {
        name: port.name || 'defaultport',
        protocol: port.protocol || 'TCP',
        port: parseInt(port.port, 10),
        targetPort: port.name || 'defaultport'
      }
    })
  }

  buildRelease() {
    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'              , 'v1']                   ,
      ['metadata.name'      , this.spec.name]    ,
      ['spec.selector.component' , this.spec.name]    ,
      ['spec.ports'  , this.ports()]          ,
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    _.forEach([
      ['spec.ports'  , this.ports()]          ,
    ], ([key, val]) => {
      _.set(this.release, key, val)
    })

    return this.release
  }

  static template(data) {
    return {
      kind: 'Service',
      apiVersion: null,
      metadata: {
        name: null
      },
      spec: {
        selector: {
          component: null
        },
        ports: []
      }
    }
  }
}

