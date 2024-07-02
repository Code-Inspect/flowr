#!/bin/bash

### Post-Process all packages within the 'Used Packages' to get normalized statistics (e.g. ignoring quotes)

if [ $# -ne 1 ]; then
    echo "Usage: $0 <root-folder-of-used-packages>"
    exit 1
fi

FOLDER_PATH="$1"
declare -A histogram

# ensure that names are valid within bash :D
escapeName() {
  local in="$1"
  in="${in//:/_c_}"
  in="${in//</_lt_}"
  in="${in//>/_gt_}"
  echo "histogram_$in"
}

all_names=() # will contain all file names (and following histograms)

for file in "${FOLDER_PATH}"/*.txt; do
  echo "Processing $file"
  filename=$(escapeName "$(basename "$file" ".txt")") # '::', ...
  all_names+=("$filename")
  declare -A "${filename}"

  # Extract the value field using jq
  values=$(jq -r '.value' "$file")

  # Remove quotes (" and ') if present
  values=${values//[\"\']/}

  # Add the values to the histogram
  for value in $values; do
    histogram["$value"]=$((histogram["$value"] + 1))
    eval "${filename}[\"$value\"]=$((${filename}[\"$value\"] + 1))"
  done
done

# Print all values but sort them by count (ascending, so even scrolling terminals show the highest used values)
echo "name,total,$(echo "${all_names[@]}" | sed 's/ /,/g')"
for key in "${!histogram[@]}"
do
    printf '%s,%s' "$key" "${histogram["$key"]}"
    for name in "${all_names[@]}"; do
      v="${name}[$key]"
      if [[ -z "${!v}" ]]; then
        printf ",0" # default value
      else
        printf ",%s" "${!v}"
      fi
    done
    echo
done | sort --numeric-sort --key=2 --field-separator=','
