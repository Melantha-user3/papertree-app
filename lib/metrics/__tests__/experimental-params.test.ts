import { describe, it, expect } from 'vitest'
import {
  inferExperimentalParamIdentity,
  normalizeExperimentalParamEntry,
  normalizeExperimentalParams,
} from '../experimental-params'

describe('inferExperimentalParamIdentity', () => {
  it('recognizes standard aliases for Efficiency / PCE', () => {
    expect(inferExperimentalParamIdentity('efficiency')).toEqual({ key: 'efficiency', label: 'Efficiency' })
    expect(inferExperimentalParamIdentity('PCE')).toEqual({ key: 'efficiency', label: 'Efficiency' })
    expect(inferExperimentalParamIdentity('power conversion efficiency')).toEqual({ key: 'efficiency', label: 'Efficiency' })
  })

  it('recognizes PLQY and its full form', () => {
    expect(inferExperimentalParamIdentity('PLQY')).toEqual({ key: 'plqy', label: 'PLQY' })
    expect(inferExperimentalParamIdentity('photoluminescence quantum yield')).toEqual({ key: 'plqy', label: 'PLQY' })
  })

  it('prefers strong known aliases (efficiency) even in longer phrases', () => {
    // Current behavior: "efficiency" pattern matches inside the string
    const result = inferExperimentalParamIdentity('External Quantum Efficiency')
    expect(result.key).toBe('efficiency')
    expect(result.label).toBe('Efficiency')
  })

  it('handles messy labels with extra whitespace', () => {
    const result = inferExperimentalParamIdentity('  Current   Density (mA/cm²)  ')
    expect(result.key).toBe('current_density')
    // Note: current implementation keeps original casing/whitespace in label
    expect(result.label).toContain('Current')
    expect(result.label).toContain('Density')
  })
})

describe('normalizeExperimentalParamEntry', () => {
  it('normalizes a well-formed entry', () => {
    const input = {
      key: 'plqy',
      label: 'PLQY',
      value: 0.85,
      unit: '%',
      raw_text: 'PLQY: 85%',
    }

    const result = normalizeExperimentalParamEntry(input)

    expect(result).toEqual({
      key: 'plqy',
      label: 'PLQY',
      value: 0.85,
      unit: '%',
      raw_text: 'PLQY: 85%',
    })
  })

  it('infers identity when only label is provided', () => {
    const result = normalizeExperimentalParamEntry({
      label: 'Responsivity',
      value: 0.42,
      unit: 'A/W',
    })

    expect(result?.key).toBe('responsivity')
    expect(result?.label).toBe('Responsivity')
  })

  it('returns null for entries without usable value', () => {
    expect(normalizeExperimentalParamEntry({ label: 'Efficiency', value: 'N/A' })).toBeNull()
    expect(normalizeExperimentalParamEntry({ label: 'PLQY' })).toBeNull()
    expect(normalizeExperimentalParamEntry(null)).toBeNull()
  })

  it('prefers explicit key over inferred key', () => {
    const result = normalizeExperimentalParamEntry({
      key: 'my_custom_efficiency',
      label: 'Efficiency',
      value: 12.3,
    })

    expect(result?.key).toBe('my_custom_efficiency')
  })
})

describe('normalizeExperimentalParams', () => {
  it('filters out invalid entries and limits results', () => {
    const input = [
      { label: 'Efficiency', value: 15.2, unit: '%' },
      { label: 'Random Metric', value: 'invalid' },
      { label: 'PLQY', value: 0.92, unit: '%' },
      null,
      { label: 'Responsivity', value: 0.3 },
      { label: 'Current Density', value: 25.4, unit: 'mA/cm²' },
    ]

    const result = normalizeExperimentalParams(input)

    expect(result).toHaveLength(4)
    expect(result.map((p) => p.key)).toEqual([
      'efficiency',
      'plqy',
      'responsivity',
      'current_density',
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(normalizeExperimentalParams(null)).toEqual([])
    expect(normalizeExperimentalParams({})).toEqual([])
  })

  it('caps results at 12 entries', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      label: `Metric ${i}`,
      value: i,
    }))

    const result = normalizeExperimentalParams(many)
    expect(result).toHaveLength(12)
  })
})
