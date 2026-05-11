import { calculateAge } from './age';

describe('calculateAge', () => {
  const referenceDate = new Date('2026-05-11T00:00:00.000Z');

  it('returns the current age after the birthday has passed', () => {
    expect(calculateAge('1999-05-11', referenceDate)).toBe(27);
  });

  it('subtracts one before the birthday in the current year', () => {
    expect(calculateAge('1999-05-12', referenceDate)).toBe(26);
  });

  it('returns null for missing or invalid birth dates', () => {
    expect(calculateAge(null, referenceDate)).toBeNull();
    expect(calculateAge('invalid', referenceDate)).toBeNull();
  });
});
