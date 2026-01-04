export const popularCompositions = {
  compositions: [
    {
      id: 'confetti-blast',
      name: 'Confetti Blast',
      description: 'Celebratory build-up followed by explosive particle bursts',
      duration: 2500,
      events: [
        {
          type: 'continuous',
          relativeTime: 0,
          duration: 800,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.2 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 850,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 1.0 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 900,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 940,
          parameters: [
            { type: 'intensity', value: 0.85 },
            { type: 'sharpness', value: 0.9 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1000,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1080,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1150,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1250,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1400,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1600,
          parameters: [
            { type: 'intensity', value: 0.35 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1900,
          parameters: [
            { type: 'intensity', value: 0.25 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2200,
          parameters: [
            { type: 'intensity', value: 0.15 },
            { type: 'sharpness', value: 0.2 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.1 },
            { relativeTime: 200, value: 0.3 },
            { relativeTime: 400, value: 0.5 },
            { relativeTime: 600, value: 0.7 },
            { relativeTime: 800, value: 1.0 },
          ],
        },
        {
          type: 'sharpness',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.2 },
            { relativeTime: 400, value: 0.4 },
            { relativeTime: 800, value: 0.8 },
          ],
        },
      ],
    },
    {
      id: 'piano-melody',
      name: 'Piano Melody',
      description: 'A gentle musical sequence mimicking piano notes',
      duration: 3200,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 400,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 800,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1000,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1400,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1600,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2000,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2200,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2600,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 2800,
          duration: 400,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 2800,
          controlPoints: [
            { relativeTime: 0, value: 0.5 },
            { relativeTime: 200, value: 0.6 },
            { relativeTime: 400, value: 0.2 },
          ],
        },
      ],
    },
    {
      id: 'heartbeat',
      name: 'Heartbeat',
      description: 'Rhythmic double-beat heart pulse pattern',
      duration: 3000,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 150,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 750,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 900,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1500,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1650,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2250,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2400,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
      ],
      curves: [],
    },
    {
      id: 'ocean-waves',
      name: 'Ocean Waves',
      description: 'Gentle rolling waves washing ashore',
      duration: 4000,
      events: [
        {
          type: 'continuous',
          relativeTime: 0,
          duration: 1200,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.2 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1500,
          duration: 1000,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.15 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 2800,
          duration: 1200,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.25 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.1 },
            { relativeTime: 400, value: 0.5 },
            { relativeTime: 800, value: 0.6 },
            { relativeTime: 1200, value: 0.15 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 1500,
          controlPoints: [
            { relativeTime: 0, value: 0.1 },
            { relativeTime: 350, value: 0.4 },
            { relativeTime: 700, value: 0.5 },
            { relativeTime: 1000, value: 0.1 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 2800,
          controlPoints: [
            { relativeTime: 0, value: 0.15 },
            { relativeTime: 500, value: 0.6 },
            { relativeTime: 900, value: 0.7 },
            { relativeTime: 1200, value: 0.1 },
          ],
        },
        {
          type: 'sharpness',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.1 },
            { relativeTime: 600, value: 0.25 },
            { relativeTime: 1200, value: 0.1 },
          ],
        },
      ],
    },
    {
      id: 'success-fanfare',
      name: 'Success Fanfare',
      description: 'Triumphant ascending celebration pattern',
      duration: 1800,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 150,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.65 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 300,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 450,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.75 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 600,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 800,
          duration: 600,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1500,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 1.0 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1600,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.9 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1700,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 800,
          controlPoints: [
            { relativeTime: 0, value: 0.8 },
            { relativeTime: 300, value: 1.0 },
            { relativeTime: 600, value: 0.7 },
          ],
        },
      ],
    },
    {
      id: 'rain-shower',
      name: 'Rain Shower',
      description: 'Soft scattered raindrops falling gently',
      duration: 3500,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 180,
          parameters: [
            { type: 'intensity', value: 0.25 },
            { type: 'sharpness', value: 0.55 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 420,
          parameters: [
            { type: 'intensity', value: 0.35 },
            { type: 'sharpness', value: 0.65 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 550,
          parameters: [
            { type: 'intensity', value: 0.2 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 780,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 920,
          parameters: [
            { type: 'intensity', value: 0.28 },
            { type: 'sharpness', value: 0.58 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1150,
          parameters: [
            { type: 'intensity', value: 0.32 },
            { type: 'sharpness', value: 0.62 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1380,
          parameters: [
            { type: 'intensity', value: 0.22 },
            { type: 'sharpness', value: 0.52 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1520,
          parameters: [
            { type: 'intensity', value: 0.38 },
            { type: 'sharpness', value: 0.68 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1700,
          parameters: [
            { type: 'intensity', value: 0.26 },
            { type: 'sharpness', value: 0.56 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1950,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2100,
          parameters: [
            { type: 'intensity', value: 0.24 },
            { type: 'sharpness', value: 0.54 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2350,
          parameters: [
            { type: 'intensity', value: 0.36 },
            { type: 'sharpness', value: 0.66 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2580,
          parameters: [
            { type: 'intensity', value: 0.28 },
            { type: 'sharpness', value: 0.58 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2780,
          parameters: [
            { type: 'intensity', value: 0.32 },
            { type: 'sharpness', value: 0.62 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3000,
          parameters: [
            { type: 'intensity', value: 0.2 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3250,
          parameters: [
            { type: 'intensity', value: 0.25 },
            { type: 'sharpness', value: 0.55 },
          ],
        },
      ],
      curves: [],
    },
    {
      id: 'engine-revving',
      name: 'Engine Revving',
      description: 'Motor vibration building up to full power',
      duration: 2500,
      events: [
        {
          type: 'continuous',
          relativeTime: 0,
          duration: 2000,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 2000,
          duration: 500,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.2 },
            { relativeTime: 300, value: 0.35 },
            { relativeTime: 500, value: 0.3 },
            { relativeTime: 800, value: 0.5 },
            { relativeTime: 1000, value: 0.45 },
            { relativeTime: 1300, value: 0.7 },
            { relativeTime: 1500, value: 0.65 },
            { relativeTime: 1800, value: 0.85 },
            { relativeTime: 2000, value: 1.0 },
          ],
        },
        {
          type: 'sharpness',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.3 },
            { relativeTime: 1000, value: 0.5 },
            { relativeTime: 2000, value: 0.7 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 2000,
          controlPoints: [
            { relativeTime: 0, value: 1.0 },
            { relativeTime: 250, value: 0.95 },
            { relativeTime: 500, value: 0.4 },
          ],
        },
      ],
    },
    {
      id: 'cosmic-pulse',
      name: 'Cosmic Pulse',
      description: 'Ethereal sci-fi inspired pulsating pattern',
      duration: 3000,
      events: [
        {
          type: 'continuous',
          relativeTime: 0,
          duration: 500,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 600,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.9 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 700,
          duration: 400,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1200,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.85 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1300,
          duration: 500,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1900,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 2000,
          duration: 600,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2700,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2850,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.1 },
            { relativeTime: 250, value: 0.5 },
            { relativeTime: 500, value: 0.2 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 700,
          controlPoints: [
            { relativeTime: 0, value: 0.2 },
            { relativeTime: 200, value: 0.6 },
            { relativeTime: 400, value: 0.25 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 1300,
          controlPoints: [
            { relativeTime: 0, value: 0.3 },
            { relativeTime: 250, value: 0.7 },
            { relativeTime: 500, value: 0.3 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 2000,
          controlPoints: [
            { relativeTime: 0, value: 0.4 },
            { relativeTime: 300, value: 0.8 },
            { relativeTime: 600, value: 0.15 },
          ],
        },
        {
          type: 'sharpness',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.9 },
            { relativeTime: 1500, value: 0.6 },
            { relativeTime: 3000, value: 0.4 },
          ],
        },
      ],
    },
    {
      id: 'drumroll',
      name: 'Drumroll',
      description: 'Building anticipation with rapid drum hits',
      duration: 2000,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 100,
          parameters: [
            { type: 'intensity', value: 0.32 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 200,
          parameters: [
            { type: 'intensity', value: 0.35 },
            { type: 'sharpness', value: 0.52 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 290,
          parameters: [
            { type: 'intensity', value: 0.38 },
            { type: 'sharpness', value: 0.52 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 370,
          parameters: [
            { type: 'intensity', value: 0.42 },
            { type: 'sharpness', value: 0.54 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 440,
          parameters: [
            { type: 'intensity', value: 0.46 },
            { type: 'sharpness', value: 0.54 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 500,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.56 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 555,
          parameters: [
            { type: 'intensity', value: 0.54 },
            { type: 'sharpness', value: 0.56 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 605,
          parameters: [
            { type: 'intensity', value: 0.58 },
            { type: 'sharpness', value: 0.58 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 650,
          parameters: [
            { type: 'intensity', value: 0.62 },
            { type: 'sharpness', value: 0.58 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 690,
          parameters: [
            { type: 'intensity', value: 0.66 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 725,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 755,
          parameters: [
            { type: 'intensity', value: 0.74 },
            { type: 'sharpness', value: 0.62 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 785,
          parameters: [
            { type: 'intensity', value: 0.78 },
            { type: 'sharpness', value: 0.62 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 810,
          parameters: [
            { type: 'intensity', value: 0.82 },
            { type: 'sharpness', value: 0.64 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 835,
          parameters: [
            { type: 'intensity', value: 0.86 },
            { type: 'sharpness', value: 0.64 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 857,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.66 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 877,
          parameters: [
            { type: 'intensity', value: 0.92 },
            { type: 'sharpness', value: 0.66 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 895,
          parameters: [
            { type: 'intensity', value: 0.95 },
            { type: 'sharpness', value: 0.68 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 912,
          parameters: [
            { type: 'intensity', value: 0.98 },
            { type: 'sharpness', value: 0.68 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 927,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1100,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 1.0 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1150,
          duration: 400,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 1150,
          controlPoints: [
            { relativeTime: 0, value: 0.9 },
            { relativeTime: 200, value: 0.5 },
            { relativeTime: 400, value: 0.1 },
          ],
        },
      ],
    },
    {
      id: 'morse-sos',
      name: 'Morse SOS',
      description: 'Classic SOS signal in haptic morse code',
      duration: 3600,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 200,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 400,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 800,
          duration: 300,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1300,
          duration: 300,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1800,
          duration: 300,
          parameters: [
            { type: 'intensity', value: 0.9 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2400,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2600,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2800,
          parameters: [
            { type: 'intensity', value: 0.8 },
            { type: 'sharpness', value: 0.7 },
          ],
        },
      ],
      curves: [],
    },
    {
      id: 'fireworks',
      name: 'Fireworks',
      description: 'Ascending rockets followed by sparkle explosions',
      duration: 4500,
      events: [
        {
          type: 'continuous',
          relativeTime: 0,
          duration: 600,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 650,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 1.0 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 720,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 800,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 900,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1050,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 1300,
          duration: 500,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.85 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1850,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 0.95 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1900,
          parameters: [
            { type: 'intensity', value: 0.85 },
            { type: 'sharpness', value: 0.9 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1960,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.75 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2040,
          parameters: [
            { type: 'intensity', value: 0.55 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2150,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2300,
          parameters: [
            { type: 'intensity', value: 0.25 },
            { type: 'sharpness', value: 0.35 },
          ],
        },
        {
          type: 'continuous',
          relativeTime: 2600,
          duration: 700,
          parameters: [
            { type: 'intensity', value: 0.7 },
            { type: 'sharpness', value: 0.9 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3350,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 1.0 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3380,
          parameters: [
            { type: 'intensity', value: 0.95 },
            { type: 'sharpness', value: 0.95 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3420,
          parameters: [
            { type: 'intensity', value: 0.85 },
            { type: 'sharpness', value: 0.85 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3480,
          parameters: [
            { type: 'intensity', value: 0.75 },
            { type: 'sharpness', value: 0.75 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3560,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.65 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3680,
          parameters: [
            { type: 'intensity', value: 0.45 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 3850,
          parameters: [
            { type: 'intensity', value: 0.3 },
            { type: 'sharpness', value: 0.4 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 4100,
          parameters: [
            { type: 'intensity', value: 0.2 },
            { type: 'sharpness', value: 0.3 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 4350,
          parameters: [
            { type: 'intensity', value: 0.1 },
            { type: 'sharpness', value: 0.2 },
          ],
        },
      ],
      curves: [
        {
          type: 'intensity',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.2 },
            { relativeTime: 300, value: 0.4 },
            { relativeTime: 600, value: 0.7 },
          ],
        },
        {
          type: 'sharpness',
          relativeTime: 0,
          controlPoints: [
            { relativeTime: 0, value: 0.5 },
            { relativeTime: 300, value: 0.7 },
            { relativeTime: 600, value: 0.9 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 1300,
          controlPoints: [
            { relativeTime: 0, value: 0.25 },
            { relativeTime: 250, value: 0.5 },
            { relativeTime: 500, value: 0.8 },
          ],
        },
        {
          type: 'intensity',
          relativeTime: 2600,
          controlPoints: [
            { relativeTime: 0, value: 0.3 },
            { relativeTime: 350, value: 0.6 },
            { relativeTime: 700, value: 0.9 },
          ],
        },
      ],
    },
    {
      id: 'typing-rhythm',
      name: 'Typing Rhythm',
      description: 'Satisfying keyboard typing pattern with varied key presses',
      duration: 2400,
      events: [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 80,
          parameters: [
            { type: 'intensity', value: 0.35 },
            { type: 'sharpness', value: 0.75 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 180,
          parameters: [
            { type: 'intensity', value: 0.42 },
            { type: 'sharpness', value: 0.82 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 260,
          parameters: [
            { type: 'intensity', value: 0.38 },
            { type: 'sharpness', value: 0.78 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 360,
          parameters: [
            { type: 'intensity', value: 0.45 },
            { type: 'sharpness', value: 0.85 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 500,
          parameters: [
            { type: 'intensity', value: 0.5 },
            { type: 'sharpness', value: 0.6 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 650,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 730,
          parameters: [
            { type: 'intensity', value: 0.36 },
            { type: 'sharpness', value: 0.76 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 820,
          parameters: [
            { type: 'intensity', value: 0.44 },
            { type: 'sharpness', value: 0.84 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 920,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1100,
          parameters: [
            { type: 'intensity', value: 0.55 },
            { type: 'sharpness', value: 0.55 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1300,
          parameters: [
            { type: 'intensity', value: 0.42 },
            { type: 'sharpness', value: 0.82 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1380,
          parameters: [
            { type: 'intensity', value: 0.38 },
            { type: 'sharpness', value: 0.78 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1460,
          parameters: [
            { type: 'intensity', value: 0.46 },
            { type: 'sharpness', value: 0.86 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1560,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1660,
          parameters: [
            { type: 'intensity', value: 0.43 },
            { type: 'sharpness', value: 0.83 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 1850,
          parameters: [
            { type: 'intensity', value: 0.6 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2050,
          parameters: [
            { type: 'intensity', value: 0.4 },
            { type: 'sharpness', value: 0.8 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2150,
          parameters: [
            { type: 'intensity', value: 0.38 },
            { type: 'sharpness', value: 0.78 },
          ],
        },
        {
          type: 'transient',
          relativeTime: 2250,
          parameters: [
            { type: 'intensity', value: 0.42 },
            { type: 'sharpness', value: 0.82 },
          ],
        },
      ],
      curves: [],
    },
  ],
} as const;
