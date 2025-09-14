// src/utils/timing.ts
export function measureTime(label: string) {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      console.log(`${label} took ${duration}ms`);
      return duration;
    }
  };
}
