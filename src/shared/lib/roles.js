export function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/standardisasi/g, 'standarisasi');
}

export function startsWithNormalizedRole(role, prefix) {
  const normalizedRole = normalizeRole(role);
  const normalizedPrefix = normalizeRole(prefix);
  return normalizedRole === normalizedPrefix || normalizedRole.startsWith(`${normalizedPrefix} `);
}

export function isUserRole(role) {
  return normalizeRole(role) === 'user';
}

export function isAvpUserRole(role) {
  return startsWithNormalizedRole(role, 'avp user');
}

export function isAvpPerencanaanRole(role) {
  return startsWithNormalizedRole(role, 'avp perencanaan');
}

export function isAvpKeandalanRole(role) {
  return startsWithNormalizedRole(role, 'avp keandalan');
}

export function isAvpPengendalianRole(role) {
  return startsWithNormalizedRole(role, 'avp pengendalian biaya dan jasa pabrik');
}

export function isStafPerencanaanRole(role) {
  return startsWithNormalizedRole(role, 'staf perencanaan');
}

export function isAvpRole(role) {
  return (
    isAvpUserRole(role)
    || isAvpPerencanaanRole(role)
    || isAvpKeandalanRole(role)
    || isAvpPengendalianRole(role)
  );
}

export function isIdentifikasiRole(role) {
  const value = normalizeRole(role);
  return value.includes('officer identifikasi') || value.includes('staf identifikasi');
}

export function canSeeDataPenggunaRole(role) {
  const value = normalizeRole(role);
  return (
    value.includes('officer identifikasi')
    || value.includes('staf identifikasi')
    || value.includes('standarisasi')
  );
}

export function isProcessOnlyRole(role) {
  return (
    isAvpPerencanaanRole(role)
    || isAvpKeandalanRole(role)
    || isAvpPengendalianRole(role)
    || isStafPerencanaanRole(role)
  );
}

export function shouldHideStockRole(role) {
  return (
    isUserRole(role)
    || isAvpUserRole(role)
    || isAvpPerencanaanRole(role)
    || isAvpKeandalanRole(role)
    || isAvpPengendalianRole(role)
    || isStafPerencanaanRole(role)
  );
}

export function shouldShowMyRequestRole(role) {
  return !(isAvpKeandalanRole(role) || isAvpPengendalianRole(role) || isAvpPerencanaanRole(role));
}
