import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts the first word from a name string
 * @param name - The full name string
 * @returns The first word of the name, or the original name if it's a single word
 */
export function getFirstName(name: string): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
}

/**
 * Formats a name to fit display constraints with line breaking
 * @param name - The full name string
 * @param maxLength - Maximum characters per line (default: 8)
 * @param maxLines - Maximum number of lines before truncating (default: 2)
 * @returns An object with formatted name and whether it was broken
 */
export function formatDisplayName(
  name: string,
  maxLength: number = 8,
  maxLines: number = 2
): {
  displayName: string;
  isBroken: boolean;
} {
  if (!name) return { displayName: "", isBroken: false };

  const trimmedName = name.trim();

  // If name fits in one line, return as is
  if (trimmedName.length <= maxLength) {
    return { displayName: trimmedName, isBroken: false };
  }

  // Split into words
  const words = trimmedName.split(/\s+/);

  // Build lines based on maxLength
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine === "") {
      // First word on this line
      if (word.length > maxLength) {
        // Word too long - break it
        currentLine = word.substring(0, maxLength);
        // Remaining part goes to next iteration
        const remaining = word.substring(maxLength);
        if (remaining.length > 0) {
          lines.push(currentLine);
          currentLine = remaining;
        }
      } else {
        currentLine = word;
      }
    } else if ((currentLine + " " + word).length <= maxLength) {
      // Word fits on current line
      currentLine += " " + word;
    } else {
      // Word doesn't fit - push current line and start new one
      lines.push(currentLine);
      if (word.length > maxLength) {
        currentLine = word.substring(0, maxLength);
        const remaining = word.substring(maxLength);
        if (remaining.length > 0) {
          lines.push(currentLine);
          currentLine = remaining;
        }
      } else {
        currentLine = word;
      }
    }
  }

  // Don't forget the last line
  if (currentLine) {
    lines.push(currentLine);
  }

  // Apply maxLines limit
  if (lines.length > maxLines) {
    // Truncate to maxLines
    const truncatedLines = lines.slice(0, maxLines);
    // Add ellipsis to last line
    let lastLine = truncatedLines[maxLines - 1];
    if (lastLine.length > maxLength - 3) {
      lastLine = lastLine.substring(0, maxLength - 3) + "...";
    } else {
      lastLine = lastLine + "...";
    }
    truncatedLines[maxLines - 1] = lastLine;

    return {
      displayName: truncatedLines.join("\n"),
      isBroken: true
    };
  }

  // No truncation needed
  return {
    displayName: lines.join("\n"),
    isBroken: lines.length > 1
  };
}
