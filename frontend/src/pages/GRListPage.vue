<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to Dashboard">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">View and manage goods receipts</p>
        </div>
      </div>
      <RouterLink to="/goods-receipts/new" class="btn btn-primary">+ New GR</RouterLink>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel">
      <table v-if="goodsReceipts.length > 0">
        <thead>
          <tr>
            <th>GR Number</th>
            <th>PO Number</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="gr in goodsReceipts" :key="gr.id">
            <td><strong>{{ gr.grNumber }}</strong></td>
            <td>{{ gr.poNumber }}</td>
            <td><span class="status-badge" :class="gr.status.toLowerCase()">{{ gr.status }}</span></td>
            <td>{{ formatDate(gr.createdAt) }}</td>
            <td><RouterLink :to="`/goods-receipts/${gr.id}`" class="link">View</RouterLink></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-message">No goods receipts yet. <RouterLink to="/goods-receipts/new">Create one</RouterLink></p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const goodsReceipts = ref([]);
const errorMessage = ref('');

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

onMounted(async () => {
  try {
    const payload = await api.listGoodsReceipts();
    goodsReceipts.value = payload.items;
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
