<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to Dashboard">&#8592;</RouterLink>
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
            <th>PO Number</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="po in purchaseOrders" :key="po.id">
            <td><strong>{{ po.poNumber }}</strong></td>
            <td>{{ po.vendorName }}</td>
            <td><span class="status-badge" :class="po.status.toLowerCase()">{{ po.status }}</span></td>
            <td>{{ formatDate(po.createdAt) }}</td>
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

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

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
