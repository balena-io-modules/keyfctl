# keyfctl

**WARNING: This is a WIP tool, and is currently alpha software**

## What does it do?

Currently, this tool will read `keyframe.yml` , `variables.yml`, and
`k8s/templates/**/*.yml` files from the repository in which
it was invoked, and then look back through git history to build a set of
'frames', or target states per-component. It is then capable of determining the
action that needs to be taken to move from frame to frame, and will make commits
to that effect.

This will probably all make a lot more sense if you look at a keyframe repo.

## Install

1. Clone this repo
2. From within this repo, run `make install`

This will install `keyfctl` to /usr/local/bin. Like `resinctl`, the `keyfctl` executable is a
wrapper around a docker container, and so must be run in a docker-compatible
environment. On first usage, Docker will pull the image.

## Manual Installation

Pull or build your own `resin/keyfctl:master` container and just run `make install`, which
will copy the executable to `/usr/local/bin`.

## Updating

Run `make update`. This will pull the latest master build.

## Usage

* `cd` into the keyframe repo you want to run this on

* run `DEBUG=keyfctl <path-to-this-repo>/bin/keyfctl`

Run it without DEBUG if you want less output.

## Development

Run `make build` to build, and bind-mount in your local directory when testing
the image:

```
docker run -it --rm -v $(pwd):/mnt/keyframe localhost/keyfctl:latest --help
```

## TODO

* Make this an installable npm module
* Integrate this into a procbot to do this automatically

