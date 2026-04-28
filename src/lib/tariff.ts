/**
 * Единый источник истины для тарификации грузов CargoTrans.
 * Используется во всех компонентах: CargoDetails, Payment, NewShipment.
 * Также синхронизирован с backend/internal/service/shipment_service.go → CalculateTariff()
 */

/** Ставка за 10 кг по маршруту (₸ / 10 кг) */
export const ROUTE_RATES: Record<string, number> = {
  'алматы-1-астана нұрлы жол': 976,
  'астана нұрлы жол-алматы-1': 976,
  'алматы-1-қарағанды': 825,
  'қарағанды-алматы-1': 825,
  'алматы-1-атырау': 1145,
  'атырау-алматы-1': 1145,
  'алматы-1-шымкент': 590,
  'шымкент-алматы-1': 590,
  'алматы-1-ақтөбе': 1114,
  'ақтөбе-алматы-1': 1114,
  'астана нұрлы жол-қарағанды': 400,
  'қарағанды-астана нұрлы жол': 400,
  'шымкент-қарағанды': 1200,
  'қарағанды-шымкент': 1200,
  'астана нұрлы жол-ақтөбе': 850,
  'ақтөбе-астана нұрлы жол': 850,
};

/** Fallback ставка для нераспознанных маршрутов */
export const DEFAULT_RATE = 5000;

/** Надбавка за хрупкость (₸) */
export const FRAGILE_SURCHARGE = 1000;

/** Надбавка за негабарит (₸) */
export const OVERSIZED_SURCHARGE = 2500;

/** Скидка при наличии ж/д билета */
export const TICKET_DISCOUNT = 0.5;

export interface TariffParams {
  fromStation: string;
  toStation: string;
  weight: string | number;
  isFragile?: boolean;
  isOversized?: boolean;
  hasTicket?: boolean;
}

/**
 * Возвращает ставку за 10 кг для данного маршрута.
 */
export function getBaseRate(from: string, to: string): number {
  const key = `${from.trim().toLowerCase()}-${to.trim().toLowerCase()}`;
  return ROUTE_RATES[key] ?? DEFAULT_RATE;
}

/**
 * Рассчитывает итоговую стоимость перевозки.
 * Формула: (вес / 10) × ставка + надбавки, затем скидка по билету.
 * Возвращает null если данных недостаточно.
 */
export function calculateShipmentCost(params: TariffParams): number | null {
  const { fromStation, toStation, weight, isFragile, isOversized, hasTicket } = params;

  if (!fromStation || !toStation || !weight) return null;

  const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight;
  if (isNaN(weightNum) || weightNum <= 0) return null;

  const rate = getBaseRate(fromStation, toStation);
  let cost = (weightNum / 10) * rate;

  if (isFragile) cost += FRAGILE_SURCHARGE;
  if (isOversized) cost += OVERSIZED_SURCHARGE;
  if (hasTicket) cost *= TICKET_DISCOUNT;

  return Math.round(cost);
}
