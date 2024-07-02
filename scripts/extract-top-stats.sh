#!/usr/bin/env bash

### Run to automatically run the 'stats' command for the top packages listed in ${FILE}

FILE="scripts/top-r-downloads.txt"
ROOT_FOLDER="${HOME}/Documents/Data/Data/CRAN/"

readarray -t content < <(cut -d ',' -f 1 "${FILE}")

# add path prefix [PATH prefix] content

for i in "${!content[@]}"; do
  arr[i]="${ROOT_FOLDER}${content[i]}"
done

DIR="./statistics-out/top-$(date +%Y-%m-%d-%H-%M-%S)/"
mkdir -p "${DIR}"
npm run stats --prefix ../cli -- "${arr[@]}" --output-dir "${DIR}" |& tee -a "./full.log"
