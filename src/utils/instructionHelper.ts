/**
 * Instruction Steps Parser Helper for Lazuardi GCS SOP
 * Parses SOP instructions containing dashes ('-'), newlines ('\n'), or pipes ('|')
 * into clean, individually formatted line-by-line steps.
 */

export function parseInstructionSteps(
  instructions: string[] | string | undefined | null
): string[] {
  if (!instructions) return [];

  const rawList = Array.isArray(instructions) ? instructions : [instructions];
  const steps: string[] = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'string') continue;

    // Split by newlines first
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Handle pipe separators: "A | B | C"
      if (trimmedLine.includes('|')) {
        const pipeParts = trimmedLine.split('|');
        for (const p of pipeParts) {
          const subSteps = parseInstructionSteps(p);
          steps.push(...subSteps);
        }
        continue;
      }

      // Check if line contains dash / bullet separators (e.g. "- Step 1 - Step 2" or "Step 1 - Step 2")
      // Handles "-", "–", "—", "•", "*"
      const hasDashSeparators =
        trimmedLine.includes(' - ') ||
        trimmedLine.includes(' – ') ||
        trimmedLine.includes(' — ') ||
        trimmedLine.includes('•') ||
        (trimmedLine.startsWith('-') && (trimmedLine.slice(1).includes('-') || trimmedLine.length > 2));

      if (hasDashSeparators) {
        // Split by dash or bullet separators: " - ", " • ", or leading dash patterns
        // We match: space then dash then space, or newline-like dash, or bullet
        const parts = trimmedLine
          .split(/(?:\s+[-–—•*]\s+|\s*[-–—•*]\s+)/)
          .map((p) => p.trim())
          .filter(Boolean);

        for (const part of parts) {
          let clean = part.trim();
          clean = clean.replace(/^[-–—•*]\s*/, '').trim();
          clean = clean.replace(/^\d+[\.\)]\s*/, '').trim();
          if (clean.length > 0) {
            steps.push(clean);
          }
        }
      } else {
        let clean = trimmedLine;
        clean = clean.replace(/^[-–—•*]\s*/, '').trim();
        clean = clean.replace(/^\d+[\.\)]\s*/, '').trim();
        if (clean.length > 0) {
          steps.push(clean);
        }
      }
    }
  }

  // Fallback if parsing resulted in empty
  if (steps.length === 0) {
    if (Array.isArray(instructions)) {
      return instructions.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof instructions === 'string' && instructions.trim().length > 0) {
      return [instructions.trim()];
    }
  }

  return steps;
}

