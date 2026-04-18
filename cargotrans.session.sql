-- Очистка всех таблиц, связанных с посылками
TRUNCATE shipments, shipment_history, notifications, scan_events, transit_events, arrival_events, qr_codes, payments, wagon_shipments CASCADE;
