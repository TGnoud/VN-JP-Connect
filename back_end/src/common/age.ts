export const DEFAULT_LEGACY_AGE = 21;

export function calculateAge(
  birthDate: Date | string | null | undefined,
  referenceDate = new Date(),
) {
  if (!birthDate) {
    return null;
  }

  const parsedBirthDate =
    birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (Number.isNaN(parsedBirthDate.getTime())) {
    return null;
  }

  let age = referenceDate.getFullYear() - parsedBirthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsedBirthDate.getMonth();
  const dayDiff = referenceDate.getDate() - parsedBirthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
