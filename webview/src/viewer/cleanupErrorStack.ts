export default function cleanupErrorStack(stack: string): string {
  const lines = stack
    .split("\n")
    // Remove internal stack lines from the "loader"
    .filter((line) => !line.includes("https://"))
    // `new Function` which is used to eval the scripts adds two lines to the beginning
    .map((line) => {
      const match = line.match(/(^.+):(\d+):(\d+)\)$/);
      if (match) {
        return `${match[1]}:${parseInt(match[2]) - 2}:${match[3]})`;
      } else {
        return line;
      }
    });

  return lines.join("\n");
}
