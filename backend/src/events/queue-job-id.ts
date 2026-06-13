export function createQueueJobId(...parts: Array<string | number | undefined | null>) {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== null && `${part}`.length > 0)
    .map((part) => `${part}`.replace(/:/g, '-'))
    .join('-')
}
