<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Purchase Order Detail</h2>
          <p class="muted">View PO information and allocations</p>
        </div>
      </div>
    </div>

    <div v-if="po" class="card-panel">
      <div class="detail-row">
        <div class="detail-field">
          <span class="label">PO ID</span>
          <span class="value">{{ po.id }}</span>
        </div>
        <div class="detail-field">
          <span class="label">Supplier</span>
          <span class="value">{{ po.supplierName }}</span>
        </div>
        <div class="detail-field">
          <span class="label">Status</span>
          <span class="value">
            <span class="status-badge" :class="`status-${po.status.toLowerCase()}`">{{ po.status }}</span>
          </span>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-field full">
          <span class="label">Delivery Address</span>
          <span class="value">{{ po.deliveryAddress }}</span>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-field">
          <span class="label">Delivery Date</span>
          <span class="value">{{ po.deliveryDate }}</span>
        </div>
        <div class="detail-field">
          <span class="label">Total</span>
          <span class="value">${{ po.total.toFixed(2) }}</span>
        </div>
      </div>

      <div v-if="po.notes" class="detail-row">
        <div class="detail-field full">
          <span class="label">Notes</span>
          <span class="value">{{ po.notes }}</span>
        </div>
      </div>
    </div>

    <div v-if="po" class="card-panel">
      <p class="section-title">Line Allocations</p>
      <table v-if="po.lines.length > 0">
        <thead>
          <tr>
            <th>Description</th>
            <th style="width: 100px">Unit Price</th>
            <th style="width: 100px">Qty Allocated</th>
            <th style="width: 120px">Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, idx) in po.lines" :key="idx">
            <td>{{ line.description }}</td>
            <td class="text-right">${{ line.unitPrice.toFixed(2) }}</td>
            <td class="text-right">{{ line.allocatedQty }}</td>
            <td class="text-right"><strong>${{ (line.unitPrice * line.allocatedQty).toFixed(2) }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="btn-group">
      <RouterLink to="/purchase-orders" class="btn btn-outline">Back to List</RouterLink>
      <button v-if="po && po.status === 'DRAFT'" class="btn btn-primary" @click="submitPO">Submit PO</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
const poId = route.params.id;

// Placeholder data - replace with API call in next phase
const po = ref({
  id: `PO-${poId}`,
  supplierName: 'Office Supplies Inc.',
  poTitle: 'Office Restocking',
  deliveryAddress: '123 Business St, Suite 100',
  deliveryDate: '2026-10-15',
  notes: 'Please prioritize delivery',
  status: 'DRAFT',
  total: 250.5,
  lines: [
    {
      description: 'Paper A4 500 sheets',
      unitPrice: 5.5,
      allocatedQty: 50,
    },
    {
      description: 'Ink Cartridge Black',
      unitPrice: 25.0,
      allocatedQty: 5,
    },
  ],
});

function submitPO() {
  // TODO: Replace with actual API call in next phase
  alert('Submit functionality coming soon');
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
}

.muted {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--white);
  border: none;
  cursor: pointer;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  transition: opacity 0.15s;
  text-decoration: none;
}

.back-btn:hover {
  opacity: 0.85;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text);
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-field.full {
  grid-column: 1 / -1;
}

.detail-field .label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-field .value {
  font-size: 14px;
  color: var(--text);
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.status-draft {
  background: #fff3e0;
  color: #e65100;
}

.status-submitted {
  background: #e3f2fd;
  color: #1565c0;
}

.status-approved {
  background: #e8f5e9;
  color: #2e7d32;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
  border-radius: 10px;
  overflow: hidden;
}

table thead {
  background: var(--table-header);
}

table th {
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

table td {
  padding: 12px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

table tbody tr:last-child td {
  border-bottom: none;
}

.text-right {
  text-align: right;
}

.btn-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--primary);
  color: var(--white);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  background: var(--white);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-outline:hover {
  background: var(--bg);
}
</style>
