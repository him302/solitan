// @soliton/maps — provider-neutral maps abstraction. Free only: LocalMapsProvider makes no
// network calls and needs no API key.
export * from './types';
export { geographicDistance, geoUri } from './geo';
export { LocalMapsProvider, type LocalMapsConfig } from './local';
export { MockMapsProvider } from './mock';
