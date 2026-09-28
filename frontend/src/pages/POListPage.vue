<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <div>
          <h2>Purchase Orders</h2>
          <p class="muted">View and manage purchase orders</p>
        </div>
      </div>
      <RouterLink to="/purchase-orders/new" class="btn btn-primary">+ New PO</RouterLink>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel">
      <table v-if="purchaseOrders.length > 0">
        <thead>
          <tr>
            <th>PO ID</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="po in purchaseOrders" :key="po.id">
            <td><strong>{{ po.id }}</strong></td>
            <td>{{ po.supplierName }}</td>
            <td><span class="status-badge" :class="`status-${po.status.toLowerCase()}`">{{ po.status }}</span></td>
            <td class="text-right">${{ po.total.toFixed(2) }}</td>
            <td><RouterLink :to="`/purchase-orders/${po.id}`" class="link">View</RouterLink></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-message">No purchase orders yet. <RouterLink to="/purchase-orders/new">Create one</RouterLink></p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const purchaseOrders = ref([]);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const payload = await api.listPurchaseOrders();
    purchaseOrders.value = payload.items;
  } catch (error) {
    errorMessage.value = error.message;
  }
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header-left {
  flex: 1;
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

table tbody tr:hover {
  background: rgba(255, 64, 129, 0.02);
}

.text-right {
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
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

.empty-message {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.15s;
}

.link:hover {
  opacity: 0.8;
}
</style>
