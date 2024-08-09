#!/bin/sh

# Let's check for updates to the package.json and if so suggest an update.
# To my knowledge, there is no "post-pull" hook unifying the semantics.
changedFiles="$(git diff-tree -r --name-only --no-commit-id HEAD@{1} HEAD)"

changed() {
  line="---------------------------------------------------------"
  echo "$line"
  echo "The package.json file has changed, it may be a good idea "
  echo "to run 'npm ci'"
  echo "$line"
}


echo "$changedFiles" | (grep --quiet "package.json" && changed)
exit 0
