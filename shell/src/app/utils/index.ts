import { Component, ProviderToken } from '@angular/core';

export function isComponent(value: unknown): value is Component {
  return typeof value === 'function';
}

export function isProviderToken(value: unknown): value is ProviderToken<unknown> {
  if (value == null) return false;
  const t = typeof value;
  return t === 'function' || t === 'object' || t === 'string' || t === 'symbol';
}
