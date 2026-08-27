import { describe, it, expect } from 'vitest';
import { inItalian, placeLabel } from './italianPlaceNames';

describe('inItalian', () => {
  it('translates the exonyms the geo providers actually return', () => {
    expect(inItalian('Rome')).toBe('Roma');
    expect(inItalian('Apulia')).toBe('Puglia');
    expect(inItalian('Lombardy')).toBe('Lombardia');
  });

  it('matches regardless of the case the provider used', () => {
    expect(inItalian('ROME')).toBe('Roma');
    expect(inItalian('  rome  ')).toBe('Roma');
  });

  it('leaves a name that is already Italian alone', () => {
    expect(inItalian('Montanaro')).toBe('Montanaro');
    expect(inItalian('Piemonte')).toBe('Piemonte');
  });
});

describe('placeLabel', () => {
  it('joins city and region, both translated', () => {
    expect(placeLabel('Rome', 'Latium')).toBe('Roma, Lazio');
  });

  it('drops a region that only repeats the city', () => {
    expect(placeLabel('Milan', 'Milan')).toBe('Milano');
    expect(placeLabel('Sao Paulo', 'Sao Paulo')).toBe('Sao Paulo');
  });

  it('returns the city alone when there is no region', () => {
    expect(placeLabel('Udine', '')).toBe('Udine');
  });
});
