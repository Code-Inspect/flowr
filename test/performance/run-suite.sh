#!/usr/bin/env bash

### Gets a suite name benchmarks the complete suite using the `benchmark` script and summarizes the results.

if [[ -z "$1" || -z "$2" ]]; then
  printf "No suite name or output file given.\nUsage: %s <suite-name> <output-file> (<process-count>) (<amount-of-runs>)\n" "$0"
  exit 1
fi

set -eu

SUITE_NAME="$1"
OUT_BASE="$2"
OUTPUT_FILE="${OUT_BASE}-summarized"
RAW_OUTPUT="${OUT_BASE}-raw"
# default to 1 parallel processes
PARALLEL="${3-1}"
# default to running 1 time
RUNS="${4-1}"

SUITE="suite-${SUITE_NAME}"
SETUP_SCRIPT="setup.sh"
ULTIMATE_SUMMARY_SUFFIX="-ultimate.json"

# check that the input file does exist
if [[ ! -d "${SUITE}" || ! -f "${SUITE}/${SETUP_SCRIPT}" ]]; then
  printf "Suite file \"%s\" does not exist or has no \"%s\".\n" "${SUITE}" "${SETUP_SCRIPT}"
  exit 2
fi

echo "Running Suite \"${SUITE}\"..."
cd "${SUITE}"
printf "  * Setup (%s)... " "${SETUP_SCRIPT}"
bash "${SETUP_SCRIPT}"
echo "done."

FILES_DIR="$(pwd)/files/"

## run the benchmark script for each file
CMD=(npm run benchmark -- --parallel "${PARALLEL}" --runs "${RUNS}" --output "${RAW_OUTPUT}" "${FILES_DIR}")

echo -e "  * Running: \"${CMD[*]}\"...\033[33m"
"${CMD[@]}"
echo -e "\033[0m  * Done (written to ${RAW_OUTPUT})."
echo "  * Summarizing results to ${OUTPUT_FILE}${ULTIMATE_SUMMARY_SUFFIX}..."

CMD=(npm run summarizer -- --input "${RAW_OUTPUT}" --output "${OUTPUT_FILE}" --graph)
echo -e "  * Running: \"${CMD[*]}\"...\033[33m"
"${CMD[@]}"
echo -e "\033[0m  * Done (written to ${OUTPUT_FILE}${ULTIMATE_SUMMARY_SUFFIX})."

# step out
cd ..
