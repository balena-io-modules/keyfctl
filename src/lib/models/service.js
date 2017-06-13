'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Service {
  constructor(revision, component) {
    this.component = component
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true
    this.template  = _.get(this, 'component.kubernetes.service', Service.template())
  }

  writeRelease() {
    if (! this.isValid()) return

    return utils.writeRelease(utils.releasePath(this.component.name), this.release)
  }

  ports() {
    return _.map(_.get(this.component, 'ports', []), port => {
      return {
        name: port.name || 'defaultport',
        protocol: port.protocol || 'TCP',
        port: port.port,
        targetPort: port.name || 'defaultport'
      }
    })
  }

  isValid() {
    if (this.ports().length < 1) return false

    return true
  }

  buildRelease() {
    if (! this.isValid()) return

    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'              , 'v1']                   ,
      ['metadata.name'      , this.component.name]    ,
      ['spec.selector.component' , this.component.name]    ,
      ['spec.selector.version'   , this.component.version] ,
      ['spec.ports'  , this.ports()]          ,
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    _.forEach([
      ['spec.ports'  , this.ports()]          ,
    ], ([key, val]) => {
      _.set(this.release, key, val)
    })
  }

  static template(data) {
    return {
      kind: 'Service',
      spec: {
        ports: []
      }
    }
  }
}

