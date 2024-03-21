#!/usr/bin/env bash

mkdir -p files/

set -eu

wget -O files/tmp.zip https://github.com/Code-Inspect/flowr/releases/download/v1.0.0/socialscience-sources.zip

# read all files to extract from static/social-science-pkg-files.txt
readarray -t USE < <(cat static/social-science-pkg-files.txt)

for i in "${!USE[@]}"; do
  USE[$i]="SocialScience/${USE[$i]}"
done

unzip files/tmp.zip "${USE[@]}" -d files/


rm files/tmp.zip
