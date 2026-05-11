export function normalizeMongoUri(
  uri: string | undefined | null,
  databaseName = 'bytebattle',
): string {
  if (!uri) {
    return '';
  }

  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = `/${databaseName}`;
    }
    return parsed.toString();
  } catch {
    return uri;
  }
}
