import type { FeatureKey } from '@eagleoutice/flowr-statistics'
import { allFeatureNames } from '@eagleoutice/flowr-statistics'
import path from 'path'

export function validateFeatures(features: (string[] | ['all'] | FeatureKey[])): Set<FeatureKey> {
	for(const feature of features) {
		if(feature === 'all') {
			if(features.length > 1) {
				console.error(`Feature "all" must be the only feature given, got ${features.join(', ')}`)
				process.exit(1)
			}
		} else if(!allFeatureNames.has(feature as FeatureKey)) {
			console.error(`Feature ${feature} is unknown, supported are ${[...allFeatureNames].join(', ')} or "all"`)
			process.exit(1)
		}
	}
	return features[0] === 'all' ? allFeatureNames : new Set(features as FeatureKey[])
}

export function retrieveArchiveName(p: string): string {
	const basepath = path.normalize(p)
	return `${basepath.endsWith(path.sep) ? basepath.substring(0, basepath.length - 1) : basepath}.tar.gz`
}
