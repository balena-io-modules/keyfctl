'use strict';

const
  _   = require("lodash"),
  utils = require('../shared/utils')

module.exports = class AutoScaler {
  constructor(specification) {
    this.specification = specification
    this.template  = _.get(this.specification, 'kubernetes.autoscaler', AutoScaler.template())
  }

  writeRelease() {
    return utils.writeRelease(utils.releasePath(this.specification.name), this.release)
  }

  buildRelease() {
    if (!this.specification.autoscaler) return
    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion', 'autoscaling/v2beta1'],
      ['spec.scaleTargetRef.apiVersion', 'apps/v1'],
      ['metadata.name', this.specification.name],
      ['spec.scaleTargetRef.name', this.specification.name],
      ['spec.minReplicas', this.specification.autoscaler.minReplicas],
      ['spec.maxReplicas', this.specification.autoscaler.maxReplicas],
      ['spec.metrics', this.specification.autoscaler.metrics]
    ], ([key, val]) => {
      _.set(this.release, key, val)
    })

    return this.release
  }

  static template() {
    return {
      kind: 'HorizontalPodAutoscaler',
      apiVersion: null,
      metadata: {
        name: null
      },
      spec: {
        scaleTargetRef: {
          apiVersion: null,
          kind: 'Deployment',
          name: null
        },
        minReplicas: 1,
        maxReplicas: 10,
        metrics: null
      }
    }
  }
}

