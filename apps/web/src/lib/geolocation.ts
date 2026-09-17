export class GeolocationDeniedError extends Error {}

export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationDeniedError('Seu navegador não suporta localização.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'É necessário autorizar o acesso à localização para entrar.'
            : 'Não foi possível obter sua localização. Tente novamente.';
        reject(new GeolocationDeniedError(message));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
