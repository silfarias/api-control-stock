import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { SearchVentaRequestDto } from './search-venta-request.dto.js';

describe('SearchVentaRequestDto.fecha', () => {
  async function validateDto(raw: Record<string, unknown>) {
    const dto = plainToInstance(SearchVentaRequestDto, raw);
    return validate(dto);
  }

  it('acepta fecha válida y otros filtros juntos', async () => {
    const errors = await validateDto({
      fecha: '2026-11-11',
      estado: EstadoVenta.CONFIRMADA,
      metodoPago: MetodoPago.EFECTIVO,
      pageNumber: 1,
      pageSize: 20,
    });
    expect(errors).toHaveLength(0);
  });

  it('rechaza fechas inválidas', async () => {
    const badFormats = await validateDto({ fecha: '11-11-2026' });
    expect(badFormats.length).toBeGreaterThan(0);

    const badDay = await validateDto({ fecha: '2026-02-31' });
    expect(badDay.length).toBeGreaterThan(0);

    const withTime = await validateDto({ fecha: '2026-11-11T23:59:59' });
    expect(withTime.length).toBeGreaterThan(0);
  });

  it('permite omitir fecha', async () => {
    const errors = await validateDto({ estado: EstadoVenta.CANCELADA });
    expect(errors).toHaveLength(0);
  });
});
