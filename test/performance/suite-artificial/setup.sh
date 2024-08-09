#!/usr/bin/env bash

mkdir -p files/
ln -sf "$(pwd)/static"/* files/
# create blown-up variants of all of them
for f in "$(pwd)/static"/*; do
  fname="$(basename "$f")"
  cp "$f" "files/${fname%.*}-large.${f##*.}"
  # shellcheck disable=SC2034
  for _i in {1..21}; do
    cat "$f" >> "files/${fname%.*}-large.${f##*.}"
  done
done
