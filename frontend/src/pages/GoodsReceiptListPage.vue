<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink
          to="/"
          class="back-btn"
          title="Back to dashboard"
          aria-label="Back to dashboard"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">Supplier delivery records</p>
        </div>
      </div>
      <RouterLink to="/goods-receipts/new" class="btn btn-primary"
        >+ New GR</RouterLink
      >
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="loading" class="muted" role="status">
      Loading goods receipts...
    </p>
    <p v-else-if="!items.length" class="muted" role="status">
      No goods receipts found.
    </p>

    <div v-else class="card-panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>GR Number</th>
            <th>PO Number</th>
            <th>Receipt Date</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <RouterLink :to="`/goods-receipts/${item.id}`">{{
                item.grNumber
              }}</RouterLink>
            </td>
            <td>
              <RouterLink :to="`/purchase-orders/${item.poId}`">{{
                item.poNumber
              }}</RouterLink>
            </td>
            <td>{{ formatDate(item.receiptDate) }}</td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">{{
                item.status
              }}</span>
            </td>
            <td>{{ item.notes || "-" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api";

const items = ref([]);
const loading = ref(true);
const errorMessage = ref("");

function formatDate(value) {
  return value ? value.slice(0, 10) : "-";
}

async function loadGoodsReceipts() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const payload = await api.listGoodsReceipts();
    items.value = payload.items || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadGoodsReceipts);
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}

table {
  min-width: 700px;
}
</style>
