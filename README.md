# keyfctl

**WARNING: This is a WIP tool, and is currently alpha software**

## What does it do?

Currently, this tool will read `keyframe.yml` and `variables.yml`
files from the repository in which
it was invoked, and then look back through git history to build a set of
'frames', or target states per-component. It is then capable of determining the
action that needs to be taken to move from frame to frame, and will make commits
to that effect.

This will probably all make a lot more sense if you look at a keyframe repo.

## Install

TODO. Currently, just clone this repo and reference `./bin/keyfctl` from your
keyframe repo.

## Manual Installation

Currently same as install above.

## Updating

Pull the latest code.

## Usage

### Linting

```
const Keyfctl = require('keyfctl')

Keyfctl.lint('<base SHA>', '<head SHA>')
// returns
// {
//   valid: <bool>,
//   messages: [<string>],
//   frames: [<Service>]
// }
```

* `cd` into the keyframe repo you want to run this on
* run `DEBUG=keyfctl <path-to-this-repo>/bin/keyfctl help`

Run it without DEBUG if you want less output. 99% of the time, as a developer
you probably want to run `keyfctl release generate --nocommit -v`, which will
simulate the changes that will be committed when your PR into the keyframe is
actually merged. `--nocommit` will disable actually committing the changes to
the release files (which must be done post-merge to master), and `-v` will give
more output about what `keyfctl` is doing and why.

### Commands

k8s help
k8s get target
k8s apply <component>
k8s logs <component>
k8s delete <component>

release generate [-c component --nowrite --nocommit -v --vv]

## Development

Same as usage, but it can also be handy to add the `--writeall` flag to force
writing every frame to disk. This will leave your final state as it would be
assuming you had no release commits in the repo.

## TODO

* Make this an installable npm module
* Integrate this into a procbot to do this automatically

