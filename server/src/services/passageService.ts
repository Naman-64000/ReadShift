/**
 * server/src/services/passageService.ts
 */

import { prisma } from "../lib/prisma.js";

export const passageService = {
  /**
   * Checks how many passages are available for a given configuration.
   */
  async getPoolDepth(domain: string, level: number) {
    return prisma.passage.count({
      where: {
        domain: domain as any,
        level,
        flagged: false,
      },
    });
  },

  /**
   * Flags a problematic passage.
   */
  async flagPassage(passageId: string, _reason: string) {
    return prisma.passage.update({
      where: { id: passageId },
      data: { flagged: true },
    });
  },
};
