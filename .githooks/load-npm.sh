#!/bin/sh

find_npm_linux() {
  export NPM_CMD="npm"
  export NPX_CMD="npx"

  if ! (type $NPM_CMD >> /dev/null); then
    echo "npm not found, trying to make it available using nvm..."
    if type nvm >> /dev/null; then
      echo "nvm found, using it to install the latest lts node"
      nvm use --lts
    else
      echo "nvm not found, trying to make it available using the nvm.sh"
      # try to make it available based on https://github.com/typicode/husky/issues/912#issuecomment-817522060
      export NVM_DIR="$HOME/.nvm/nvm.sh"
      . "$(dirname $NVM_DIR)/nvm.sh"

      export NVM_DIR="$HOME/.nvm"
      a=$(nvm ls --no-colors | grep 'node')
      v=$(echo "$a" | sed -E 's/.*\(-> ([^ ]+).*/\1/')

      export PATH="$NVM_DIR/versions/node/$v/bin:$PATH"

      if ! (type $NPM_CMD >> /dev/null); then
        echo "no variant of npm or nvm found, trying to use the npm.cmd"
        export NPM_CMD="npm.cmd"
        export NPX_CMD="npx.cmd"
      fi
    fi
  fi
}

if [ -z "${OSTYPE+x}" ]; then
  find_npm_linux
else
  case "$OSTYPE" in
    msys*) export NPM_CMD="npm.cmd" ;
           export NPX_CMD="npx.cmd" ;;
    *)     find_npm_linux ;;
  esac
fi
