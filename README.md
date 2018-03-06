# keyfctl

**WARNING: This is a WIP tool, and is currently alpha software**

TODO:

* module for parsing keyframe files
* models for each type of deployable artifact
* module for converting deployable artifact to output format
* module for taking output format and applying it
* wrapper module for determining changed targets and then running deploys for
  them
* cli commands
  validate -f <filename>


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

* `cd` into the keyframe repo you want to run this on
* run `<path-to-this-repo>/bin/keyfctl help`

99% of the time you probably want to run `keyfctl generate -w`, which will
write the release files to `k8s/releases`. If you drop the `-w`, it will do
everything except write the releases, which will effectively validate the
keyframe.

### Commands

generate [ -v, -d, -k, -c, -s, -w ]

## Development

Same as usage, but it can also be handy to add the `--writeall` flag to force
writing every frame to disk. This will leave your final state as it would be
assuming you had no release commits in the repo.

## TODO

* Make this an installable npm module
* Integrate this into a procbot to do this automatically

