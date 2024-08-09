export type Os = 'mac-os' | 'linux' | 'windows' | 'unknown'

let platformCache: Os | null = null

export function getPlatform(): Os {
	if(platformCache !== null) {
		return platformCache
	}

	const platform =  process.platform
	if(platform === 'darwin') {
		platformCache = 'mac-os'
	} else if(platform === 'linux') {
		platformCache = 'linux'
	} else if(platform === 'win32') {
		platformCache = 'windows'
	} else {
		platformCache = 'unknown'
	}

	return platformCache
}
