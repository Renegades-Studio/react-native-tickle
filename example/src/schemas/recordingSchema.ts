import { z } from 'zod';

// Schema for haptic event parameters
const hapticEventParameterSchema = z.object({
  type: z.enum(['intensity', 'sharpness']),
  value: z.number().min(0).max(1),
});

// Schema for haptic events
const hapticEventSchema = z.object({
  type: z.enum(['transient', 'continuous']),
  parameters: z.array(hapticEventParameterSchema),
  relativeTime: z.number().min(0),
  duration: z.number().min(0).optional(),
});

// Schema for haptic curve control points
const hapticCurveControlPointSchema = z.object({
  relativeTime: z.number().min(0),
  value: z.number().min(0).max(1),
});

// Schema for haptic curves
const hapticCurveSchema = z.object({
  type: z.enum(['intensity', 'sharpness']),
  controlPoints: z.array(hapticCurveControlPointSchema),
  relativeTime: z.number().min(0),
});

// Schema for recorded haptic
export const recordedHapticSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.number().positive(),
  duration: z.number().min(0),
  events: z.array(hapticEventSchema).min(0),
  curves: z.array(hapticCurveSchema).min(0),
});

export type RecordedHapticValidation = z.infer<typeof recordedHapticSchema>;
