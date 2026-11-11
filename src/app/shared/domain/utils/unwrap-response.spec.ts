import { lastValueFrom, of } from 'rxjs';
import { MissingResponseDataError, requireData, unwrapData } from './unwrap-response';

describe('unwrapData', () => {
  const ok = { entityName: 'x', message: 'ok', statusCode: 200 };

  it('devuelve el contenido de data', async () => {
    expect(await lastValueFrom(of({ ...ok, data: { id: 1 } }).pipe(unwrapData()))).toEqual({ id: 1 });
  });

  it('conserva valores falsos válidos como 0 o la lista vacía', () => {
    expect(requireData({ ...ok, data: 0 })).toBe(0);
    expect(requireData({ ...ok, data: [] })).toEqual([]);
  });

  it('lanza un error tipado si data falta', () => {
    expect(() => requireData(ok)).toThrowError(MissingResponseDataError);
  });

  it('el error llega por el canal de error del observable', async () => {
    await expectAsync(lastValueFrom(of(ok).pipe(unwrapData()))).toBeRejectedWith(jasmine.any(MissingResponseDataError));
  });
});
