import { NodeId } from '../../../src/r-bridge'
import {
  DefaultEnvironmentMemory,
  GlobalScope,
  IEnvironment,
  initializeCleanEnvironments,
  LocalScope
} from '../../../src/dataflow'
import { guard } from '../../../src/util/assert'
import { expect } from 'chai'
import { appendEnvironments, define, overwriteEnvironments } from '../../../src/dataflow/environments'
import { variable } from './environments'

/** if you pass multiple `definedAt`, this will expect the node to have multiple definitions */
function existsDefinedAt(name: string, definedAt: NodeId[], result: IEnvironment | undefined, message?: string) {
  if(result === undefined) {
    expect.fail('there should be a result')
  }
  const got = result.memory.get(name)
  guard(got !== undefined, `${name} should exist. ${message ?? ''}`)
  expect(got, `${name} should have one possible definition per defined at (${JSON.stringify(definedAt)}). ${message ?? ''}`).to.have.length(definedAt.length)
  expect(got.map(d => d.definedAt), `${name} should be defined at ${JSON.stringify(definedAt)}. ${message ?? ''}`).to.deep.equal(definedAt)
}

describe('Overwrite', () => {
  describe('Global', () => {
    it('Different variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('x', '_1'), GlobalScope, clean)
      const overwrite = initializeCleanEnvironments()
      define(variable('y', '_2'), GlobalScope, overwrite)
      const result = overwriteEnvironments(clean, overwrite)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2 + DefaultEnvironmentMemory.size)
      existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
      existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
    })

    it('Same variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('x', '_1'), GlobalScope, clean)
      const overwrite = initializeCleanEnvironments()
      define(variable('x', '_2'), GlobalScope, overwrite)
      const result = overwriteEnvironments(clean, overwrite)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.current.memory, 'there should be only one definition for x').to.have.length(1 + DefaultEnvironmentMemory.size)
      existsDefinedAt('x', ['_2'], result.current)
    })
  })

  // TODO: with stack fo local environments
  // TODO: with named environments
  describe('Local', () => {
    it('Different variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('long', '_1'), LocalScope, clean)
      const overwrite = initializeCleanEnvironments()
      define(variable('short', '_2'), LocalScope, overwrite)
      const result = overwriteEnvironments(clean, overwrite)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
      expect(result.current.memory, 'there should be two definitions for long and short').to.have.length(2 + DefaultEnvironmentMemory.size)
      existsDefinedAt('long', ['_1'], result.current)
      existsDefinedAt('short', ['_2'], result.current)
    })

    it('Same variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('long', '_1'), LocalScope, clean)
      const overwrite = initializeCleanEnvironments()
      define(variable('long', '_2'), LocalScope, overwrite)
      const result = overwriteEnvironments(clean, overwrite)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
      expect(result.current.memory, 'there should be only one definition for long').to.have.length(1 + DefaultEnvironmentMemory.size)
      existsDefinedAt('long', ['_2'], result.current)
    })
  })
})

describe('Append', () => {
  describe('Global', () => {
    it('Different variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('x', '_1'), GlobalScope, clean)
      const append = initializeCleanEnvironments()
      define(variable('y', '_2'), GlobalScope, append)
      const result = appendEnvironments(clean, append)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2 + DefaultEnvironmentMemory.size)
      existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
      existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
    })

    it('Same variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('x', '_1'), GlobalScope, clean)
      const append = initializeCleanEnvironments()
      define(variable('x', '_2'), GlobalScope, append)
      const result = appendEnvironments(clean, append)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.current.memory, 'there should be only one symbol defined (for x)').to.have.length(1 + DefaultEnvironmentMemory.size)
      existsDefinedAt('x', ['_1', '_2'], result.current)
    })
  })

  // TODO: with stack fo local environments
  // TODO: with named environments
  describe('Local', () => {
    it('Different variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('local-long', '_1'), LocalScope, clean)
      const append = initializeCleanEnvironments()
      define(variable('local-short', '_2'), LocalScope, append)
      const result = appendEnvironments(clean, append)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.level, 'neither definitions nor appends should produce new local scopes').to.be.equal(0)
      expect(result.current.memory, 'there should be two definitions for local-long and local-short').to.have.length(2 + DefaultEnvironmentMemory.size)
      existsDefinedAt('local-long', ['_1'], result.current)
      existsDefinedAt('local-short', ['_2'], result.current)
    })

    it('Same variables', () => {
      const clean = initializeCleanEnvironments()
      define(variable('local-long', '_1'), LocalScope, clean)
      const append = initializeCleanEnvironments()
      define(variable('local-long', '_2'), LocalScope, append)
      const result = appendEnvironments(clean, append)
      expect(result, 'there should be a result').to.be.not.undefined
      expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
      expect(result.current.memory, 'there should be only one definition for local-long').to.have.length(1 + DefaultEnvironmentMemory.size)
      existsDefinedAt('local-long', ['_1', '_2'], result.current)
    })
  })
})
