# Performance Tests

<!-- TOC -->
* [Performance Tests](#performance-tests)
  * [General Note](#general-note)
  * [Structure](#structure)
<!-- TOC -->

## General Note

All of these benchmarks are meant to be executed on a linux machine, preferably the continuous integration environment. Hence, all scripts are written in bash and allowed to use tools to symlink etc.  

Currently tests are not repeated.

## Structure

Every folder contains a suite that is used by the performance test (see the [performance-test.sh](performance-test.sh)).
To avoid bloating this repository with a lot of otherwise unnecessary files, not all suites actually contain the files
that are used for the benchmark (they download them on the first use). Additionally, this avoids licensing issues.

Each suite has to contain the following files:

- a `README.md` file that describes the intention and contents of the suite
- a `setup.sh` which should populate the new, ignored `files` folder that contains all input files for the performance benchmark.

  If your benchmark should use files contained within the same folder (as it is done by the [artificial suite](suite-artificial)), the `setup.sh` may simply link/copy the respective contents. 