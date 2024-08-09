# Performance Tests

<!-- TOC -->
- [Performance Tests](#performance-tests)
  - [General Note](#general-note)
  - [How to Run?](#how-to-run)
  - [Structure](#structure)
<!-- TOC -->

## General Note

All of these benchmarks are meant to be executed on a linux machine, preferably the continuous integration environment. Hence, all scripts are written in bash and allowed to use tools to symlink etc.

Currently, tests are not repeated, so all results are subject to the variations in the CI environment. For the results, see: <https://flowr-analysis.github.io/flowr/wiki/stats/benchmark>.

## How to Run?

Simply start the [run-all-suites.sh](run-all-suites.sh) or the [run-suite.sh](run-suite.sh) script. However, please keep in mind, that the benchmarks are intended to be run within the continuous integration environment (or retroactively to create more plots for each commit).


## Structure

Every folder contains a suite that is used by the performance test (see the [run-suite.sh](run-suite.sh)).
To avoid bloating this repository with a lot of otherwise unnecessary files, not all suites actually contain the files
that are used for the benchmark (they download them on the first use). Additionally, this avoids licensing issues.

Each suite has to contain the following files:

- a `README.md` file that describes the intention and contents of the suite.
- a `setup.sh` which should populate the new, ignored `files` folder that contains all input files for the performance benchmark.

If your benchmark should use files contained within the same folder (as it is done by the [artificial suite](suite-artificial)), the `setup.sh` may simply link/copy the respective contents.

Furthermore, each suite must have its own upload action in the QA workflow!.
