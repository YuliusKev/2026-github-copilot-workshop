<template>
  <section class="goods-receipt-page">
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink
          to="/goods-receipts"
          class="back-btn"
          title="Back to goods receipts"
          aria-label="Back to goods receipts"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Goods Receipt Detail</h2>
          <p class="muted">{{ receipt?.grNumber || "" }} - Delivery record</p>
        </div>
      </div>
      <button
        v-if="receipt?.status === 'DRAFT'"
        class="btn btn-primary"
        type="button"
        :disabled="posting || loading"
        @click="postReceipt"
      >
        {{ posting ? "Posting..." : "Post Receipt" }}
      </button>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="loading" class="muted" role="status">Loading goods receipt...</p>

    <template v-if="receipt">
      <section class="card-panel">
        <p class="form-section-title">Receipt Header</p>
        <div class="form-row receipt-fields">
          <div class="form-group">
            <label>GR Number</label>
            <input :value="receipt.grNumber" disabled />
          </div>
          <div class="form-group">
            <label>Purchase Order</label>
            <RouterLink :to="`/purchase-orders/${receipt.poId}`">{{
              receipt.poNumber
            }}</RouterLink>
          </div>
          <div class="form-group">
            <label>Status</label>
            <span class="status-badge" :class="receipt.status.toLowerCase()">{{
              receipt.status
            }}</span>
          </div>
          <div class="form-group">
            <label>Receipt Date</label>
            <input :value="formatDate(receipt.receiptDate)" disabled />
          </div>
          <div class="form-group full">
            <label>Notes</label>
            <textarea :value="receipt.notes || '-'" rows="2" disabled />
          </div>
        </div>
      </section>

      <section class="card-panel">
        <p class="form-section-title">Received Lines</p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th>Item</th>
                <th>Received Quantity</th>
                <th>UOM</th>
                <th>Actual Site</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in receipt.lines" :key="line.id">
                <td>{{ line.lineNo }}</td>
                <td>{{ line.itemCode }} - {{ line.itemName }}</td>
                <td>{{ line.qtyReceived }}</td>
                <td>{{ line.uom }}</td>
                <td>{{ line.actualSiteCode }}</td>
              </tr>
              <tr v-if="!receipt.lines.length">
                <td colspan="5" class="muted">No receipt lines found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { api } from "../api";

const route = useRoute();
const receipt = ref(null);
const loading = ref(false);
const posting = ref(false);
const errorMessage = ref("");

function formatDate(value) {
  return value ? value.slice(0, 10) : "-";
}

async function loadReceipt() {
  loading.value = true;
  errorMessage.value = "";
  receipt.value = null;
  try {
    receipt.value = await api.getGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function postReceipt() {
  posting.value = true;
  errorMessage.value = "";
  try {
    receipt.value = await api.postGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    posting.value = false;
  }
}

watch(() => route.params.id, loadReceipt, { immediate: true });
</script>

<style scoped>
.goods-receipt-page {
  max-width: 1440px;
  margin: 0 auto;
}

.receipt-fields {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.receipt-fields input:disabled,
.receipt-fields textarea:disabled {
  background: var(--white);
  color: var(--text);
  cursor: default;
  opacity: 1;
}

.status-badge.posted {
  background: #e8f5e9;
  color: #2e7d32;
}

.table-scroll {
  overflow-x: auto;
}

table {
  min-width: 700px;
}

@media (max-width: 700px) {
  .receipt-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .receipt-fields {
    grid-template-columns: 1fr;
  }
}
</style>
