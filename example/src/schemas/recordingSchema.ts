import { z } from 'zod';

const hapticEventParameterSchema = z.object({
  type: z.enum(['intensity', 'sharpness']),
  value: z.number().min(0).max(1),
});

const transientHapticEventSchema = z.object({
  type: z.literal('transient'),
  parameters: z.array(hapticEventParameterSchema),
  relativeTime: z.number().min(0),
});

const continuousHapticEventSchema = z.object({
  type: z.literal('continuous'),
  parameters: z.array(hapticEventParameterSchema),
  relativeTime: z.number().min(0),
  duration: z.number().min(0),
});

const hapticEventSchema = z.discriminatedUnion('type', [
  transientHapticEventSchema,
  continuousHapticEventSchema,
]);

const hapticCurveControlPointSchema = z.object({
  relativeTime: z.number().min(0),
  value: z.number().min(0).max(1),
});

const hapticCurveSchema = z.object({
  type: z.enum(['intensity', 'sharpness']),
  controlPoints: z.array(hapticCurveControlPointSchema),
  relativeTime: z.number().min(0),
});

export const recordedHapticSchema = z.object({
  events: z.array(hapticEventSchema).min(1),
  curves: z.array(hapticCurveSchema).min(0),
});

export type RecordedHapticValidation = z.infer<typeof recordedHapticSchema>;
