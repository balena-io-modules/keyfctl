'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Secret {
  constructor(spec, secrets) {
    this.spec = spec
    this.secrets = secrets
    this.template  = _.get(this.spec, 'kubernetes.secret', Secret.template())
    this.availableVars = this.secrets.componentVars(this.spec.name)
    this.usedVars = _.get(this.spec, 'secrets', [])
    this.release = undefined
  }

  versionName() {
    return `${this.spec.name}-${this.spec.version}`
  }

  anyVars() {
    return this.usedVars.length > 0
  }

  buildRelease() {
    if (!this.anyVars()) return

    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'    , 'v1']               ,
      ['metadata.name' , this.versionName()] ,
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    for (let n of this.usedVars) {
      const res = _.find(this.availableVars, ['name', n])

      _.set(this.release, `data.${res.name}`, new Buffer.from(res.value).toString('base64'))
    }

    return this.release
  }

  static template() {
    return {
      kind: 'Secret',
      apiVersion: null,
      metadata: null,
      type: 'Opaque',
      data: null
    }
  }
}

