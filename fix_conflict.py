import re

with open("backend/internal/storage/postgres/postgres.go", "r") as f:
    content = f.read()

# Replace block 1: INSERT VALUES
block1 = """<<<<<<< HEAD
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.CreatedAt, shipment.UpdatedAt)
=======
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.CreatedAt, shipment.UpdatedAt)
>>>>>>> 6b38a2eed8f0bc26ce6e48495c18f9ffb0d84c99"""
resolved1 = """	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.CreatedAt, shipment.UpdatedAt)"""
content = content.replace(block1, resolved1)

# UPDATE query arguments
block2 = """<<<<<<< HEAD
			tracking_code = $23,
			qr_code_id = $24,
			transport_unit_id = $25,
			courier_id = $26,
			is_door_to_door = $27,
			pickup_address = $28,
			delivery_address = $29,
			door_to_door_phone = $30,
			payment_required = $31,
			extra_charge = $32,
			pickup_code = $33,
			issue_code = $34,
			last_updated_at = $35,
			created_by = $36,
			updated_at = $37
		WHERE id = $1
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.CourierID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.UpdatedAt)
=======
			sender_phone = $23,
			tracking_code = $24,
			qr_code_id = $25,
			transport_unit_id = $26,
			courier_id = $27,
			is_door_to_door = $28,
			pickup_address = $29,
			delivery_address = $30,
			door_to_door_phone = $31,
			payment_required = $32,
			extra_charge = $33,
			last_updated_at = $34,
			created_by = $35,
			updated_at = $36
		WHERE id = $1
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.CourierID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.UpdatedAt)
>>>>>>> 6b38a2eed8f0bc26ce6e48495c18f9ffb0d84c99"""

resolved2 = """			sender_phone = $23,
			tracking_code = $24,
			qr_code_id = $25,
			transport_unit_id = $26,
			courier_id = $27,
			is_door_to_door = $28,
			pickup_address = $29,
			delivery_address = $30,
			door_to_door_phone = $31,
			payment_required = $32,
			extra_charge = $33,
			pickup_code = $34,
			issue_code = $35,
			last_updated_at = $36,
			created_by = $37,
			updated_at = $38
		WHERE id = $1
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.CourierID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.UpdatedAt)"""
content = content.replace(block2, resolved2)


block3 = """<<<<<<< HEAD
const shipmentSelect = `SELECT id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route, status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, tracking_code, qr_code_id, transport_unit_id, COALESCE(courier_id, '') as courier_id, is_door_to_door, pickup_address, delivery_address, door_to_door_phone, payment_required, extra_charge, pickup_code, issue_code, last_updated_at, created_by, created_at, updated_at FROM shipments`
=======
const shipmentSelect = `SELECT id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route, status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, sender_phone, tracking_code, qr_code_id, transport_unit_id, COALESCE(courier_id, '') as courier_id, is_door_to_door, pickup_address, delivery_address, door_to_door_phone, payment_required, extra_charge, last_updated_at, created_by, created_at, updated_at FROM shipments`
>>>>>>> 6b38a2eed8f0bc26ce6e48495c18f9ffb0d84c99"""
resolved3 = """const shipmentSelect = `SELECT id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route, status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, sender_phone, tracking_code, qr_code_id, transport_unit_id, COALESCE(courier_id, '') as courier_id, is_door_to_door, pickup_address, delivery_address, door_to_door_phone, payment_required, extra_charge, pickup_code, issue_code, last_updated_at, created_by, created_at, updated_at FROM shipments`"""
content = content.replace(block3, resolved3)


block4 = """<<<<<<< HEAD
	err := row.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt)
=======
	err := row.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt)
>>>>>>> 6b38a2eed8f0bc26ce6e48495c18f9ffb0d84c99"""
resolved4 = """	err := row.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt)"""
content = content.replace(block4, resolved4)

block5 = """<<<<<<< HEAD
		if err := rows.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt); err != nil {
=======
		if err := rows.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt); err != nil {
>>>>>>> 6b38a2eed8f0bc26ce6e48495c18f9ffb0d84c99"""
resolved5 = """		if err := rows.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt); err != nil {"""
content = content.replace(block5, resolved5)

with open("backend/internal/storage/postgres/postgres.go", "w") as f:
    f.write(content)


# Fix Arrival.tsx
with open("src/components/Arrival.tsx", "r") as f:
    arr = f.read()

arr = re.sub(r'<<<<<<< HEAD(.*?)=======(.*?)>>>>>>> [a-f0-9]+', lambda m: m.group(1) if len(m.group(1)) > len(m.group(2)) else m.group(1), arr, flags=re.DOTALL)

with open("src/components/Arrival.tsx", "w") as f:
    f.write(arr)

# Fix Payment.tsx
with open("src/components/shipment-steps/Payment.tsx", "r") as f:
    pay = f.read()

pay = re.sub(r'<<<<<<< HEAD(.*?)=======(.*?)>>>>>>> [a-f0-9]+', lambda m: m.group(1) if len(m.group(1)) > len(m.group(2)) else m.group(1), pay, flags=re.DOTALL)

with open("src/components/shipment-steps/Payment.tsx", "w") as f:
    f.write(pay)

