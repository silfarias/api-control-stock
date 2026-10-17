export function renameOnDelete(originalName: string): string {
  const date = new Date().getTime().toString().slice(-6);
  return `${originalName}_(deleted_${date})`;
}