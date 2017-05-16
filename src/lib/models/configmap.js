'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Configmap {
  constructor(revision, component) {
    this.revision  = revision
    this.component = component
    this.errors    = []
    this.rationale = []
    this.valid     = true
    this.template  = _.get(this, 'component.kubernetes.configmap', Configmap.template())
    this.release   = undefined
    this.availableVars = {}
    this.usedVars = []
  }

  writeRelease() {
    return utils.writeRelease(utils.releasePath(this.component.name), this.release)
  }

  versionName() {
    return `${this.component.name}-${this.component.version}-${this.revision}`
  }

  buildRelease() {
    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'    , 'v1']               ,
      ['metadata.name' , this.versionName()] ,
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    for (let n of this.usedVars) {
      const res = _.find(this.availableVars, ['name', n])

      _.set(this.release, `data.${res.name}`, `${res.value}`)
    }
  }

  static template() {
    return {
      kind: 'ConfigMap'
    }
  }
}

