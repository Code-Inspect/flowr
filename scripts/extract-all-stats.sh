#!/usr/bin/env bash

### Runs stats for all packages in parallel for chunks given by `SPLIT`

ROOT_FOLDER="${HOME}/Documents/CRAN/"
SPLIT=16

echo "Scanning for packages in: \"${ROOT_FOLDER}\" (this may take a while)"

readarray -t CONTAINED < <(find "${ROOT_FOLDER}" -mindepth 1 -maxdepth 1)

echo "Total number of packages: ${#CONTAINED[@]}"

# named reference to array
size=$(( (${#CONTAINED[@]} + SPLIT - 1) / SPLIT ))

echo "Chunk size: ${size}"

dirBasis="./statistics-out/$(date +%Y-%m-%d-%H-%M-%S)"
echo "Output directory base: ${dirBasis}"

# Split the array into chunks
for ((i = 0; i < ${#CONTAINED[@]}; i += size)); do
  chunkNumber=$(( (i / size) + 1 ))
  echo "Chunk ${chunkNumber}"
  chunk=("${CONTAINED[@]:i:size}")

  mkdir -p "${dirBasis}/${chunkNumber}/"
  # shellcheck disable=SC2068
  npm run stats --prefix ../cli -- ${chunk[@]} --output-dir "${dirBasis}/${chunkNumber}/" > "${dirBasis}/${chunkNumber}/full.log" 2>&1 &

  # printf '%s\n' "${chunk[@]}"
done
