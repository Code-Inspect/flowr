export interface Handler<ValueType> {
	getName: () => string,
	enter:   () => void
	exit:    () => ValueType
	next:    (value: ValueType) => void
}