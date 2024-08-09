#!/usr/bin/env bash

# clean up existing folder
rm -rf files/

mkdir -p files/

set -eu

wget -O files/tmp.zip https://github.com/flowr-analysis/flowr/releases/download/v1.0.0/socialscience-sources.zip

# read all files to extract from static/social-science-pkg-files.txt
readarray -t USE < <(cat static/social-science-pkg-files.txt)

for i in "${!USE[@]}"; do
  USE[$i]="SocialScience/${USE[$i]}"
done

echo "Extracting ${#USE[@]} files from tmp.zip..."
echo "Files to extract: ${USE[*]}"
unzip -u files/tmp.zip "${USE[@]}" -d files/


rm files/tmp.zip
