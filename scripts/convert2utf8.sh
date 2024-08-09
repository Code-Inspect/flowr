#!/usr/bin/env bash

### Converts all files in the given folder to utf-8 encoding
# Sadly xmlparsedata can not work with non-utf8 files :/

if [ $# -ne 1 ]; then
    echo "Usage: $0 <root-folder>"
    exit 1
fi

# for each file in the given dir
find "$1" -type f -exec sh -c '
  file="$1"
  echo "@$file"
  # that is not utf-8
  if ! iconv -f utf-8 -t utf-8 "$file" >/dev/null 2>&1; then
    echo "Processing $file"
    # identify the original charset
    charset="$(file -bi "$file" | sed "s/.*charset=\([^;]*\).*/\1/")"
    # recover the charset
    iconv -f ${charset} -t utf-8 "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
  fi
' shell "{}" \;
