const enum RequiredFeature {
	/** https://github.com/Code-Inspect/flowr/labels/typing */
	Typing,
	/** https://github.com/Code-Inspect/flowr/labels/abstract%20interpretation */
	AbstractInterpretation,
}

export interface FlowrCapability {
	/** The human-readable name of the capability */
	readonly name:          string
	/**
	 * The unique identifier of the capability, used to refer to it independent of the location.
	 * We could use a key-value mapping. However, this way, an id is self-contained and can be moved around as one object.
	 */
	readonly id:            string
	/** A list of features that are required for the capability, extend at need. */
	readonly needs?:        RequiredFeature[]
	readonly description?:  string
	readonly note?:         string
	/** The level of support for the capability, undefined if it is a meta-capability that does not need such an attribute */
	readonly supported?:    'not' | 'partially' | 'fully'
	readonly capabilities?: readonly FlowrCapability[]
}

export interface FlowrCapabilities {
	/** The human-readable name of the capabilities */
	readonly name:         string
	/** A description of the capabilities */
	readonly description:  string
	/** The version of the capabilities */
	readonly version:      string
	/** A list of the capabilities */
	readonly capabilities: readonly FlowrCapability[]
}
