# FASE 4 PROGRESS: TOUCHSCREEN UI BACKEND
## API Support untuk Touchscreen Interface

**Status**: 🔵 Not Started  
**Progress**: 0% (0/10 days completed)  
**Owner**: TBD  
**Start Date**: TBD  
**Target Completion**: TBD  
**Actual Completion**: -

---

## 📊 Progress Summary

### Week 1: API Design & Implementation (Days 1-5)
- [ ] **Day 1-2**: Table Layout API
  - [ ] `GET /api/restaurant/tables/layout` - Load custom grid
  - [ ] `POST /api/restaurant/tables/layout` - Save custom grid
  - [ ] `PATCH /api/restaurant/tables/:id/position` - Drag & drop update
  - [ ] `GET /api/restaurant/tables/:id/status` - Real-time availability
  - [ ] Validation: Grid boundaries (0-1000 x 0-1000 px)
  - [ ] Unit tests untuk layout logic
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 3-4**: Quick Access API
  - [ ] `GET /api/pos/quick-items` - Frequently used items (paginated)
  - [ ] `POST /api/pos/quick-items` - Add to quick access
  - [ ] `DELETE /api/pos/quick-items/:id` - Remove dari quick access
  - [ ] `PATCH /api/pos/quick-items/reorder` - Drag to reorder
  - [ ] `GET /api/restaurant/menu/quick` - Quick menu categories
  - [ ] Response optimization: Minimize payload size
  - [ ] Unit tests untuk quick access
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 5**: Search & Filter API
  - [ ] `GET /api/restaurant/menu/search?q=coffee` - Fuzzy search
  - [ ] `GET /api/restaurant/menu?category=drinks` - Filter by category
  - [ ] `GET /api/pos/items/search?barcode=123456` - Barcode lookup
  - [ ] Search optimization: Index name, sku, barcode fields
  - [ ] Response time target: < 200ms
  - [ ] Unit tests untuk search algorithms
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

### Week 2: Real-time Features & Optimization (Days 6-10)
- [ ] **Day 6-7**: WebSocket Implementation (Optional)
  - [ ] Setup Socket.IO atau native WebSocket
  - [ ] Event: `table:status:changed` - Table occupied/available
  - [ ] Event: `order:status:changed` - Order status updates
  - [ ] Event: `kitchen:order:new` - New order ke kitchen display
  - [ ] Room management: Per-tenant isolation
  - [ ] Authentication: JWT token validation untuk WS
  - [ ] Test dengan multiple clients (10+ concurrent)
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: Optional feature, bisa polling jika WS too complex

- [ ] **Day 8**: Response Optimization
  - [ ] Implement response compression (gzip)
  - [ ] Add pagination untuk menu lists (20 items/page)
  - [ ] Implement field selection (`?fields=id,name,price`)
  - [ ] Add ETags untuk caching menu data
  - [ ] Add Redis caching untuk frequently accessed data
  - [ ] Benchmark: Load time improvement measurement
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 9**: Testing
  - [ ] Load testing: 50 concurrent touchscreen users
  - [ ] Test drag & drop position updates (rapid fire)
  - [ ] Test search performance dengan large menu (500+ items)
  - [ ] Test WebSocket stability (if implemented)
  - [ ] Test offline/online sync scenarios
  - [ ] Integration tests: Full workflow end-to-end
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 10**: Documentation & Deployment
  - [ ] API documentation dengan request/response examples
  - [ ] WebSocket event documentation (if implemented)
  - [ ] Frontend integration guide untuk UI team
  - [ ] Performance tuning guide
  - [ ] Deploy ke staging
  - [ ] UAT dengan mock touchscreen UI
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

---

## 📝 Detailed Task Breakdown

### Table Layout API
- [ ] **GET /tables/layout**
  - Response: Array of table objects dengan x, y, width, height, rotation
  - Caching: Redis 5 minutes TTL
  - Authorization: `view:restaurant-tables`
- [ ] **POST /tables/layout**
  - Request: Complete layout JSON (15-20 tables)
  - Validation: Grid boundaries, no overlaps
  - Authorization: `manage:restaurant-tables`
- [ ] **PATCH /tables/:id/position**
  - Request: {x, y} coordinates
  - Optimistic updates: Return immediately, validate async
  - Authorization: `manage:restaurant-tables`
- [ ] **GET /tables/:id/status**
  - Response: {status: 'available|occupied|reserved', order_id}
  - Real-time: Poll every 5s atau WebSocket push
  - Authorization: `view:restaurant-tables`

### Quick Access API
- [ ] **GET /pos/quick-items**
  - Response: Top 20 frequently used items
  - Sort: By usage count DESC
  - Pagination: 20 items per page
  - Authorization: `view:pos-items`
- [ ] **POST /pos/quick-items**
  - Request: {item_id, position}
  - Validation: Max 50 quick items per station
  - Authorization: `manage:pos-items`
- [ ] **DELETE /pos/quick-items/:id**
  - Soft delete: Keep history
  - Authorization: `manage:pos-items`
- [ ] **PATCH /pos/quick-items/reorder**
  - Request: [{id, position}] array
  - Batch update: All positions in single transaction
  - Authorization: `manage:pos-items`

### Search & Filter API
- [ ] **GET /restaurant/menu/search**
  - Query param: `q` (search term)
  - Algorithm: Fuzzy match pada name, description
  - Response time: < 200ms
  - Authorization: `view:restaurant-menu`
- [ ] **GET /restaurant/menu**
  - Query param: `category` (filter)
  - Response: Menu items grouped by category
  - Caching: Redis 10 minutes TTL
  - Authorization: `view:restaurant-menu`
- [ ] **GET /pos/items/search**
  - Query param: `barcode` (exact match)
  - Index: Unique index pada barcode field
  - Response time: < 100ms
  - Authorization: `view:pos-items`

### WebSocket Events (Optional)
- [ ] **table:status:changed**
  - Payload: {table_id, status, order_id}
  - Trigger: On order creation/completion
  - Room: `tenant:{tenant_id}:restaurant`
- [ ] **order:status:changed**
  - Payload: {order_id, status, timestamp}
  - Trigger: On status update (new → preparing → ready)
  - Room: `tenant:{tenant_id}:restaurant:orders`
- [ ] **kitchen:order:new**
  - Payload: {order_id, table_number, items}
  - Trigger: On order submission
  - Room: `tenant:{tenant_id}:kitchen`

### Response Optimization
- [ ] Compression: gzip middleware untuk JSON responses
- [ ] Pagination: Limit 20-50 items per page
- [ ] Field selection: `?fields=id,name,price` query param
- [ ] ETags: Cache-Control headers untuk static data
- [ ] Redis caching: Menu data, quick items (5-10 min TTL)

---

## 🐛 Issues & Blockers

### Current Blockers
- None

### Potential Risks
- **Table Position Conflicts**: Multiple users drag same table simultaneously
  - Mitigation: Optimistic locking dengan version field, last-write-wins
- **WebSocket Connection Drops**: WiFi instability di restaurant
  - Mitigation: Auto-reconnect logic, fallback ke polling
- **Search Performance**: Slow dengan large menu (1000+ items)
  - Mitigation: Database indexing, full-text search (PostgreSQL tsvector)
- **Caching Invalidation**: Stale data setelah menu update
  - Mitigation: Event-based cache invalidation, TTL 5-10 minutes

### Resolved Issues
- None

---

## 📊 Metrics & KPIs

### Performance Targets
- [ ] Table layout API response time < 200ms
- [ ] Quick access API response time < 100ms
- [ ] Search API response time < 200ms
- [ ] WebSocket event latency < 500ms (if implemented)
- [ ] Support 50 concurrent touchscreen users
- [ ] Test coverage > 70%

### Current Metrics
- Table layout API: Not measured yet
- Quick access API: Not measured yet
- Search API: Not measured yet
- WebSocket latency: Not measured yet
- Concurrent users: Not tested
- Test coverage: 0%

---

## 🔄 Daily Updates

### 2025-11-22 (Example format)
- **Progress**: Not started yet (depends on Fase 2 completion)
- **Completed**: Planning documentation finalized
- **Next**: Design API contracts untuk frontend team
- **Blockers**: None
- **Notes**: Consider WebSocket vs polling tradeoffs

---

## ✅ Definition of Done

- [ ] All table layout APIs implemented
- [ ] All quick access APIs implemented
- [ ] All search & filter APIs implemented
- [ ] WebSocket implemented (atau polling fallback documented)
- [ ] Response optimization applied (compression, caching, pagination)
- [ ] All tests passing (unit + integration + load)
- [ ] API documentation complete dengan examples
- [ ] Frontend integration guide created
- [ ] Deployed to staging
- [ ] UAT completed dengan mock touchscreen
- [ ] Performance metrics met
- [ ] No critical bugs

---

## 📚 References

- [Plan Document](../../plan/PHASE-04-TOUCHSCREEN-UI.md)
- [Restaurant Models](../../src/models/restaurantTable.js)
- [POS Models](../../src/models/posQuickItem.js)
- [API Documentation](../API-DOCUMENTATION.md)

---

## 🔗 Dependencies

### Upstream Dependencies (Must Complete First)
- ✅ Fase 2: POS & Restaurant (needs table layout data, menu data)

### Downstream Dependencies (Blocks These)
- ⏳ Frontend touchscreen UI implementation (different team/repo)

---

## 🎨 Frontend Integration Notes

### Expected Frontend Tech Stack
- React/Vue/Svelte dengan touch event handling
- Drag & drop library: react-dnd, vue-draggable, etc.
- WebSocket client: socket.io-client atau native WebSocket API
- State management: Redux/Vuex untuk table status sync

### API Contract Examples
```json
// GET /api/restaurant/tables/layout
{
  "tables": [
    {
      "id": 1,
      "number": "T01",
      "x": 100,
      "y": 150,
      "width": 120,
      "height": 120,
      "rotation": 0,
      "capacity": 4,
      "status": "available"
    }
  ],
  "grid_size": {"width": 1000, "height": 1000}
}

// WebSocket event: table:status:changed
{
  "event": "table:status:changed",
  "data": {
    "table_id": 1,
    "status": "occupied",
    "order_id": 456
  }
}
```

---

**Last Updated**: 2025-11-22  
**Updated By**: System (Initial creation)
