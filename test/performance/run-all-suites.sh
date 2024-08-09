#!/usr/bin/env bash

set -eu

# default to 1 parallel processes
PARALLEL="${1-1}"
# default to running 1 time
RUNS="${2-1}"
ONLY_SUITE="${3-}"


SUITE_PREFIX="suite-"
OUTPUT_DIR="results"

mkdir -p "${OUTPUT_DIR}"

## collect all suites in this folder, sort for consistency
readarray -t SUITES < <(find . -maxdepth 1 -type d -name "${SUITE_PREFIX}*" | sed "s|^\./${SUITE_PREFIX}||" | sort)

echo "Found ${#SUITES[*]} suite(s)"

if [[ -n "${ONLY_SUITE}" ]]; then
  SUITES=("${ONLY_SUITE}")
fi

for SUITE in "${SUITES[@]}"; do
  mkdir -p "${OUTPUT_DIR}/${SUITE}"
  CMD=(bash run-suite.sh "${SUITE}" "$(pwd)/${OUTPUT_DIR}/${SUITE}/${SUITE}" "${PARALLEL}" "${RUNS}")
  echo -e "Suite-Command: \"${CMD[*]}\"..."
  "${CMD[@]}"
done
