# Item Notes/Remarks Feature

## Overview

Setiap item dalam order dapat memiliki **notes/remarks** yang akan:
- ✅ Tersimpan di database (`TransactionItem.notes`)
- ✅ Otomatis muncul di **customer receipt**
- ✅ Otomatis muncul di **kitchen ticket** (bold, dengan prefix `>>`)
- ✅ Support untuk **Restaurant, POS, dan Combined Billing**

---

## Database Schema

### TransactionItem Model

```javascript
{
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Customer notes/remarks for this item'
  }
}
```

---

## API Usage

### 1. Restaurant Order

**Endpoint**: `POST /api/v1/restaurant/orders`

**Request Body**:
```json
{
  "orderType": "dine-in",
  "tableId": "uuid-table-id",
  "locationId": "uuid-location-id",
  "customerName": "John Doe",
  "items": [
    {
      "productId": "29d499d9-1fae-4db5-b7c9-d46707ec6e7d",
      "quantity": 1,
      "notes": "Pedas level 3, tanpa bawang putih"
    },
    {
      "productId": "uuid-nasi-goreng",
      "quantity": 2,
      "notes": "Matang well done, tambah kerupuk",
      "extras": [
        { "extraId": "uuid-telur", "quantity": 1 }
      ]
    },
    {
      "productId": "uuid-drink",
      "quantity": 1,
      "notes": null  // No notes - OK
    }
  ],
  "payments": [
    { "method": "cash", "amount": 200000 }
  ],
  "notes": "Order untuk meja 5, customer VIP"
}
```

**Notes Fields**:
- `items[].notes` - Notes per item (muncul di customer receipt & kitchen ticket)
- `notes` - Notes untuk keseluruhan order (muncul di header/footer)

---

### 2. Combined Billing

**Endpoint**: `POST /api/v1/restaurant/combined/transactions`

**Request Body**:
```json
{
  "customerId": "uuid-member-id",
  "customerType": "member",
  "items": [
    {
      "type": "product",
      "productId": "uuid-aglio-olio",
      "quantity": 1,
      "notes": "Extra sambal, no ice"
    },
    {
      "type": "membership",
      "membershipTypeId": "uuid-gold-membership",
      "notes": "Request personal trainer John"
    },
    {
      "type": "product",
      "productId": "uuid-coffee",
      "quantity": 2,
      "notes": "One hot, one iced"
    }
  ],
  "payments": [
    { "method": "debit", "amount": 1500000 }
  ]
}
```

---

### 3. POS Transaction

**Endpoint**: `POST /api/v1/gym/transactions`

**Request Body**:
```json
{
  "customerId": "uuid-member-id",
  "items": [
    {
      "productId": "uuid-supplement",
      "quantity": 1,
      "notes": "Kirim ke locker #25"
    }
  ],
  "payments": [
    { "method": "cash", "amount": 250000 }
  ]
}
```

---

## Receipt Display Format

### Customer Receipt

```
================================
    GYM DYNASTY FITNESS
    Jl. Sudirman No. 123
    Tel: 021-12345678
================================

Order: ORD-20260219-045
Tanggal: 19 Feb 2026 14:30
Tipe: Dine In
Meja: 5
Pelanggan: John Doe
Kasir: Admin

--------------------------------

AGLIO E OLIO                    
   x1 @Rp 55.000      Rp 55.000
   * Pedas level 3, tanpa bawang putih

NASI GORENG SPESIAL
   x2 @Rp 35.000      Rp 70.000
   + Extra Telur
      Rp 5.000
   * Matang well done, tambah kerupuk

ES THE MANIS
   x1 @Rp 10.000      Rp 10.000

--------------------------------
Subtotal:              Rp 140.000
Service (6%):            Rp 8.400
Pajak (10%):            Rp 14.000
--------------------------------
TOTAL BAYAR:          Rp 162.400

Pembayaran:
Tunai                 Rp 200.000
Kembalian              Rp 37.600

================================
Terima kasih atas kunjungan Anda!
================================
```

### Kitchen Ticket

```
================================
       === DAPUR ===
================================

Order: ORD-20260219-045
Waktu: 14:30
Tipe: Dine In
Meja: 5
Atas Nama: John Doe

--------------------------------

AGLIO E OLIO
   x1
   >> Pedas level 3, tanpa bawang putih

NASI GORENG SPESIAL
   x2
   ++ Extra Telur
   >> Matang well done, tambah kerupuk

ES THE MANIS
   x1

--------------------------------
        SEGERA PROSES!
================================
```

---

## Styling on Receipt

### Customer Receipt
- Notes ditampilkan dengan prefix `*`
- Font: Normal
- Position: Below item name and price

### Kitchen Ticket
- Notes ditampilkan dengan prefix `>>`
- Font: **Bold** (COMMANDS.BOLD_ON)
- Position: Below item extras
- Lebih prominent untuk visibility

---

## Backend Implementation

### 1. Saving Notes (orderController.js)

```javascript
orderItems.push({
  itemType: 'product',
  itemId: product.id,
  itemName: product.name,
  quantity,
  unitPrice: finalUnitPrice,
  subtotal: itemSubtotal,
  total: itemTotal,
  notes: item.notes || null,  // ← Saved here
  itemDetails: {
    extras: selectedExtras,
    // ...
  }
});
```

### 2. Displaying Notes (receiptPrinterService.js)

**Customer Receipt**:
```javascript
// Item notes
if (item.notes) {
  content += `   * ${item.notes}` + COMMANDS.LINE_FEED;
}
```

**Kitchen Ticket**:
```javascript
// Notes (important for kitchen)
if (item.notes && bodyTemplate.showNotes !== false) {
  content += COMMANDS.BOLD_ON;
  content += `   >> ${item.notes}` + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
}
```

---

## Template Configuration

### Default Order Receipt Template

```javascript
{
  body: {
    showItems: true,
    showItemDetails: true,
    showNotes: true,  // ← Show notes
    // ...
  }
}
```

### Kitchen Ticket Template

```javascript
{
  body: {
    showModifiers: true,
    showNotes: true,  // ← Show notes (bold)
    notesLabel: 'Catatan',
    showPrices: false,  // Kitchen doesn't need prices
    // ...
  }
}
```

---

## Validation Rules

### Notes Field

- **Type**: String (TEXT in database)
- **Max Length**: No strict limit (TEXT type)
- **Nullable**: Yes (optional field)
- **Default**: `null`

### Best Practices

1. **Length**: Keep notes concise (recommended max 100 chars for readability)
2. **Language**: Support Indonesian and English
3. **Special chars**: Avoid special ESC/POS control characters
4. **Line breaks**: Use single line, printer will auto-wrap if needed

---

## Common Use Cases

### Restaurant Orders

```json
{
  "notes": "No onion"
}
{
  "notes": "Extra spicy"
}
{
  "notes": "Matang well done"
}
{
  "notes": "Sausnya dipisah"
}
```

### Membership/Service Plans

```json
{
  "notes": "Request trainer John"
}
{
  "notes": "Prefer morning class 07:00"
}
{
  "notes": "Member renewal - extend 3 months"
}
```

### Product Orders

```json
{
  "notes": "Gift wrap please"
}
{
  "notes": "Kirim ke locker #25"
}
{
  "notes": "Bottle color: blue"
}
```

---

## Error Handling

### Invalid Notes (Special Characters)

Backend doesn't validate notes content, but avoid:
- ESC/POS control codes (`\x1b`, `\x1d`, etc.)
- Excessive line breaks (`\n\n\n`)
- Very long text (>200 chars may truncate on receipt)

### Missing Notes Field

```json
// All valid:
{ "notes": "Some note" }
{ "notes": null }
{ "notes": "" }
{ }  // notes omitted
```

---

## Testing

### Test Cases

1. **Order with notes**
   - Add item with notes
   - Verify saved in database
   - Verify printed on receipt

2. **Order without notes**
   - Add item without notes field
   - Verify no notes printed

3. **Mixed items**
   - Some items with notes
   - Some items without notes
   - All should work correctly

4. **Special characters**
   - Test with Indonesian chars (é, ñ, etc.)
   - Test with numbers and symbols
   - Verify correct display

---

## Frontend Implementation Example

### React/Vue Component

```jsx
function OrderForm() {
  const [items, setItems] = useState([
    { productId: '', quantity: 1, notes: '' }
  ]);

  const updateItemNotes = (index, notes) => {
    const newItems = [...items];
    newItems[index].notes = notes;
    setItems(newItems);
  };

  return (
    <div>
      {items.map((item, idx) => (
        <div key={idx}>
          <select 
            value={item.productId}
            onChange={(e) => updateItemProduct(idx, e.target.value)}
          >
            <option>Select Product</option>
            {/* ... */}
          </select>
          
          <input 
            type="number"
            value={item.quantity}
            onChange={(e) => updateItemQty(idx, e.target.value)}
          />
          
          {/* Notes input */}
          <textarea
            placeholder="Catatan (opsional): contoh: Pedas level 3, tanpa bawang"
            value={item.notes}
            onChange={(e) => updateItemNotes(idx, e.target.value)}
            maxLength={200}
            rows={2}
          />
        </div>
      ))}
      
      <button onClick={submitOrder}>Submit Order</button>
    </div>
  );
}
```

---

## Troubleshooting

### Notes not showing on receipt

1. Check template configuration: `body.showNotes` should be `true`
2. Verify item has notes in database
3. Check printer supports text characters

### Notes truncated

1. Reduce notes length
2. Check printer paper width setting
3. Use shorter, concise notes

### Kitchen ticket not showing notes

1. Verify kitchen ticket template has `showNotes: true`
2. Check printer assigned for kitchen tickets
3. Verify order sent to kitchen

---

## Migration Notes

No migration needed - `notes` field already exists in `TransactionItem` model since initial schema.

---

## Related Documentation

- [Receipt Template Configuration](./RECEIPT-TEMPLATE-CONFIG.md)
- [Kitchen Ticket System](./KITCHEN-TICKET-SYSTEM.md)
- [Restaurant Order API](./RESTAURANT-ORDER-API.md)
- [Combined Billing API](./COMBINED-BILLING-API.md)
