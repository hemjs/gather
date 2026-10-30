export class GatherError extends Error {
  static {
    setName(this, 'GatherError');
  }

  constructor(
    readonly index: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class InvalidProviderError extends GatherError {
  static {
    setName(this, 'InvalidProviderError');
  }

  constructor(index: number, reason: string) {
    super(index, `Invalid config provider at index ${index}: ${reason}`);
  }
}

export class ProviderFailedError extends GatherError {
  static {
    setName(this, 'ProviderFailedError');
  }

  constructor(index: number, cause: unknown) {
    const message = (cause as { message?: unknown } | null)?.message;
    const reason =
      typeof message === 'string' && message ? message : String(cause);
    super(index, `Config provider at index ${index} threw: ${reason}`, {
      cause,
    });
  }
}

function setName(type: { prototype: Error }, name: string): void {
  Object.defineProperty(type.prototype, 'name', {
    value: name,
    writable: true,
    configurable: true,
  });
}
