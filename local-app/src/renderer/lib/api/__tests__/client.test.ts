import { describe, it, expect } from 'vitest'
import { unwrap } from '../client'

describe('API response unwrapping', () => {
  it('unwrap extracts data from envelope', () => {
    const response = { data: { id: '1', name: 'test' }, ok: true, status: 200 }
    const result = unwrap<{ id: string; name: string }>(response)
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('unwrap passes through plain data without envelope', () => {
    const response = { data: { id: '1' } }
    const result = unwrap<{ id: string }>(response)
    expect(result).toEqual({ id: '1' })
  })

  it('unwrap extracts array from envelope', () => {
    const response = { data: [{ id: '1' }, { id: '2' }], ok: true, status: 200 }
    const result = unwrap<{ id: string }[]>(response)
    expect(result).toHaveLength(2)
  })

  it('unwrap handles paginated envelope', () => {
    const response = {
      data: [{ id: '1' }],
      meta: { page: 1, per_page: 10, total: 1, pages: 1 },
      ok: true,
      status: 200,
    }
    const result = unwrap<{ id: string }[]>(response)
    expect(result).toHaveLength(1)
  })
})
