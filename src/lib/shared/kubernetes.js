'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  exec    = Promise.promisify(require("child_process").exec),
  utils   = require('../shared/utils')

const apply = (componentName) => {
  return exec(`kubectl apply -f ${utils.releasePath(componentName)}`)
  .catch(utils.printStderr)
}
module.exports.apply = apply

const deleteComponent = (componentName) => {
  return exec(`kubectl delete ingress ${componentName}`)
  .then(res => exec(`kubectl delete service ${componentName}`))
  .then(res => exec(`kubectl delete deployment ${componentName}`))
}
module.exports.deleteComponent = deleteComponent

const viewActiveConfig = () => {
  return exec(`kubectl config view --minify`)
  .then(utils.parseYaml)
  .then(obj => obj['current-context'])
}
module.exports.viewActiveConfig = viewActiveConfig

const logs = (componentName) => {
  return exec(`kubectl get deployment ${componentName} -o json`)
  .then(JSON.parse)
  .then(obj => {
    console.log(obj)
    return exec(`kubectl get po -o json`)
    .then(json => {
      let pods = JSON.parse(json)

      pods = _.filter(pods.items, (pod) => {
        console.log(pod)
        return pod.metadata.labels.component === componentName &&
          pod.metadata.labels.version === obj.metadata.version
      })

      return pods
    })
    .then(pods => exec(`kubectl logs ${pods[0].metadata.name}`))
  })
}
module.exports.logs = logs

