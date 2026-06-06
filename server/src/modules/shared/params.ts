export function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}
