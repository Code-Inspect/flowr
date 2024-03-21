import { version } from '../../package.json'
import { SemVer } from 'semver'

export function flowrVersion(): SemVer {
	return new SemVer(version)
}
