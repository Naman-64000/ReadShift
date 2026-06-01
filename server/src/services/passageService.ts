/**
 * server/src/services/passageService.ts
 */

import { prisma } from "../lib/prisma.js";

export const passageService = {
  async getPoolDepth(domain: string) {
    return prisma.passage.count({
      where: {
        domain: domain as any,
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
