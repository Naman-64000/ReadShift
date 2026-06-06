/**
 * server/src/middleware/timezone.ts
 * Formats all Date objects in Express response payloads to GMT+5:30 (IST) format recursively.
 */

import { Request, Response, NextFunction } from "express";

function toISTString(date: Date): string {
  // Asia/Kolkata is GMT+5:30. Offset in minutes is 330.
  const offsetMs = 330 * 60 * 1000;
  const localTime = new Date(date.getTime() + offsetMs);
  return localTime.toISOString().replace("Z", "+05:30");
}

export function formatDatesToIST(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    if (!isNaN(obj.getTime())) {
      return toISTString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(formatDatesToIST);
  }

  if (typeof obj === "object") {
    // Avoid traversing stream/buffer constructors
    if (obj.constructor && obj.constructor.name === "Buffer") {
      return obj;
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = formatDatesToIST(obj[key]);
    }
    return newObj;
  }

  if (typeof obj === "string") {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    if (isoDateRegex.test(obj)) {
      return toISTString(new Date(obj));
    }
  }

  return obj;
}

export function timezoneMiddleware(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  res.json = function (body: any) {
    const formattedBody = formatDatesToIST(body);
    return originalJson.call(this, formattedBody);
  };
  next();
}
