import { describe, it, expect } from 'vitest'
import {
  compactWhitespace,
  inferPublicationYear,
  buildMockAnalysis,
  buildMockSynthesisReview,
} from '../llm-client'

describe('compactWhitespace', () => {
  it('collapses multiple whitespace characters', () => {
    expect(compactWhitespace('  hello   world  \n\t  ')).toBe('hello world')
  })
})

describe('inferPublicationYear', () => {
  it('extracts the most frequent year from document text', () => {
    const text = 'Published in 2023. Follow-up work appeared in 2024. Another paper from 2023.'
    const result = inferPublicationYear(text, null)

    expect(result.publicationYear).toBe(2023)
    expect(result.publicationYearSource).toBe('document_text')
  })

  it('falls back to PDF metadata when no year is found in text', () => {
    const result = inferPublicationYear('No year here', 2022)
    expect(result.publicationYear).toBe(2022)
    expect(result.publicationYearSource).toBe('pdf_metadata')
  })

  it('ignores years outside reasonable academic range', () => {
    const result = inferPublicationYear('Ancient work from 1492 and future prediction 3025', 2010)
    expect(result.publicationYear).toBe(2010)
    expect(result.publicationYearSource).toBe('pdf_metadata')
  })
})

describe('buildMockAnalysis (characterization)', () => {
  const baseInput = {
    title: 'High-Efficiency PbS Quantum Dot Solar Cells via Surface Passivation',
    fileName: 'qd-solar-cells.pdf',
    text: `
      Abstract: We report a power conversion efficiency of 15.2% in PbS quantum dot solar cells.
      The devices show a PLQY of 92% after ligand exchange and annealing optimization.
      Current density reached 28.4 mA/cm² with responsivity of 0.45 A/W.
      Published in Advanced Materials, 2023.
    `,
    fallbackYear: 2023,
  }

  it('produces consistent structure and extracts experimental parameters', () => {
    const result = buildMockAnalysis(baseInput)

    expect(result.title).toContain('PbS Quantum Dot')
    // Current mock behavior: isAcademic depends on academic signal count
    expect(typeof result.isAcademic).toBe('boolean')
    expect(result.publicationYear).toBe(2023)
    expect(result.topics.length).toBeGreaterThan(0)
    expect(result.experimentalParams.length).toBeGreaterThan(0)
    expect(result.keyPoints.length).toBeGreaterThan(0)
  })

  it('extracts key experimental parameters with correct units', () => {
    const result = buildMockAnalysis(baseInput)

    const efficiency = result.experimentalParams.find((p) => p.key === 'efficiency')
    expect(efficiency?.value).toBeCloseTo(15.2)
    expect(efficiency?.unit).toBe('%')

    const plqy = result.experimentalParams.find((p) => p.key === 'plqy')
    expect(plqy?.value).toBeCloseTo(92)
  })

  it('marks results as mock analysis', () => {
    const result = buildMockAnalysis(baseInput)
    expect(result.summary).toContain('mock analysis')
  })

  it('handles non-academic documents gracefully', () => {
    const nonAcademic = buildMockAnalysis({
      title: 'Invoice for lab equipment',
      fileName: 'invoice.pdf',
      text: 'Please pay the attached invoice before the due date.',
      fallbackYear: null,
    })

    expect(nonAcademic.isAcademic).toBe(false)
    expect(nonAcademic.academicConfidence).toBeLessThan(0.5)
  })
})

describe('buildMockSynthesisReview (characterization)', () => {
  const sampleChain = [
    {
      title: 'Initial PbS QD Study',
      publicationYear: 2021,
      summary: 'Early demonstration of ligand exchange improving PLQY.',
      venue: 'ACS Nano',
      techRouteTags: ['Surface Passivation'],
      experimentalParams: [{ key: 'plqy', label: 'PLQY', value: 65, unit: '%', raw_text: 'PLQY 65%' }],
      keyPoints: ['First successful passivation'],
    },
    {
      title: 'Annealing Optimization for Higher Efficiency',
      publicationYear: 2023,
      summary: 'Systematic study of annealing temperature on device performance.',
      venue: 'Advanced Materials',
      techRouteTags: ['Annealing Optimization'],
      experimentalParams: [
        { key: 'efficiency', label: 'Efficiency', value: 15.2, unit: '%', raw_text: 'PCE 15.2%' },
      ],
      keyPoints: ['Record efficiency at 180°C'],
    },
  ]

  it('generates a structured literature review with expected sections', () => {
    const result = buildMockSynthesisReview({
      title: 'PbS Quantum Dot Evolution',
      chain: sampleChain,
    })

    expect(result).toContain('# Literature Review: PbS Quantum Dot Evolution')
    expect(result).toContain('## Timeline')
    expect(result).toContain('## Synthesis')
    expect(result).toContain('2021')
    expect(result).toContain('2023')
  })

  it('includes parameter trends when available', () => {
    const result = buildMockSynthesisReview({
      title: 'PbS Quantum Dot Evolution',
      chain: sampleChain,
    })

    // Current implementation uses "Efficiency 15.2 %" format with space before unit
    expect(result).toContain('Efficiency 15.2')
    expect(result).toContain('PLQY 65')
  })
})
